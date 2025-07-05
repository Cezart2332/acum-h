import requests
import pdfplumber
import re
import concurrent.futures
import threading
import time
import os
import chromadb
import unicodedata
import hashlib
import redis
from io import BytesIO
from typing import List, Dict, Any, Tuple, Optional
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer
from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate
from functools import lru_cache
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OptimizedAIRecommender:
    def __init__(
        self,
        dotnet_api_url: str,
        ollama_host: str = "http://localhost:11434",
        llm_model: str = "mistral",
        max_workers: int = 2,  # Reduced from 3
        cache_dir: str = "chroma_cache",
        refresh_minutes: int = 60,
        redis_host: str = "localhost",
        redis_port: int = 6379,
        redis_db: int = 0
    ):
        self.api_url = dotnet_api_url.rstrip("/")
        self.ollama_host = ollama_host
        self.llm_model = llm_model
        self.max_workers = max_workers
        self.cache_dir = cache_dir
        self.refresh_minutes = refresh_minutes
        
        # Initialize Redis for caching
        try:
            self.redis_client = redis.Redis(host=redis_host, port=redis_port, db=redis_db)
            self.redis_client.ping()
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using in-memory cache.")
            self.redis_client = None
        
        # Initialize ChromaDB with optimizations
        self.chroma_client = chromadb.PersistentClient(path=cache_dir)
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        self.collection = self.chroma_client.get_or_create_collection(
            name="restaurant_menus",
            embedding_function=self.embedding_fn
        )
        
        # Load lighter embedding model for better performance
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize Mistral LLM with optimizations
        self.llm = Ollama(
            base_url=ollama_host,
            model=llm_model,
            temperature=0.7,
            num_ctx=2048,  # Reduced context window
            num_predict=256,  # Reduced prediction length
            system=(
                "Ești un asistent expert în recomandări de restaurante. "
                "Răspunzi concis, prietenos și folosești emoji. "
                "Maxim 3 propoziții per răspuns."
            )
        )
        
        # Optimized conversation templates
        self.dish_template = ChatPromptTemplate.from_messages([
            ("system", "Expert culinar. Răspunde concis."),
            ("human", "Caută: {query}\nOpțiuni: {options}\nRăspuns:")
        ])
        
        self.restaurant_template = ChatPromptTemplate.from_messages([
            ("system", "Concierge restaurante. Răspunde concis."),
            ("human", "Doresc: {query}\nRestaurante: {options}\nRăspuns:")
        ])
        
        # Optimized stop words (reduced set)
        self.stop_words = {
            "unde", "pot", "sa", "să", "care", "ce", "cu", "la", "un", "o", 
            "vreau", "caut", "și", "sau", "pentru", "in", "în", "pe", "de"
        }
        
        # Precompute normalized stop words
        self.normalized_stop_words = {self.remove_diacritics(word) for word in self.stop_words}
        
        # Initialize data structures
        self.company_data = []
        self.menu_cache = {}
        self.response_cache = {}  # In-memory cache for responses
        
        # Load or refresh data
        self.refresh_data()
        
        # Start background refresh thread
        self.refresh_thread = threading.Thread(target=self.auto_refresh, daemon=True)
        self.refresh_thread.start()

    def get_cache_key(self, query: str, query_type: str = "general") -> str:
        """Generate cache key for query"""
        normalized = self.normalize_query(query)
        return hashlib.md5(f"{query_type}:{normalized}".encode()).hexdigest()

    def get_cached_response(self, cache_key: str) -> Optional[str]:
        """Get cached response from Redis or memory"""
        if self.redis_client:
            try:
                cached = self.redis_client.get(f"ai_response:{cache_key}")
                if cached:
                    return cached.decode('utf-8')
            except Exception as e:
                logger.warning(f"Redis get failed: {e}")
        
        # Fallback to in-memory cache
        return self.response_cache.get(cache_key)

    def set_cached_response(self, cache_key: str, response: str, ttl: int = 3600):
        """Set cached response in Redis or memory"""
        if self.redis_client:
            try:
                self.redis_client.setex(f"ai_response:{cache_key}", ttl, response)
                return
            except Exception as e:
                logger.warning(f"Redis set failed: {e}")
        
        # Fallback to in-memory cache with size limit
        if len(self.response_cache) > 1000:  # Limit memory usage
            # Remove oldest entries
            keys_to_remove = list(self.response_cache.keys())[:100]
            for key in keys_to_remove:
                del self.response_cache[key]
        
        self.response_cache[cache_key] = response

    def auto_refresh(self):
        """Background thread to periodically refresh data"""
        while True:
            time.sleep(self.refresh_minutes * 60)
            logger.info("Auto-refreshing menu data...")
            try:
                self.refresh_data()
            except Exception as e:
                logger.error(f"Auto-refresh failed: {e}")

    def refresh_data(self):
        """Refresh all company and menu data with optimizations"""
        try:
            # Step 1: Fetch all companies
            companies = self.fetch_companies()
            if not companies:
                logger.warning("No companies found in API response")
                return
                
            self.company_data = companies
            
            # Only process new companies or those with updated menus
            companies_to_process = self.get_companies_to_process(companies)
            
            if not companies_to_process:
                logger.info("No companies need processing")
                return
            
            # Step 2: Process menus in parallel with reduced workers
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = [executor.submit(self.process_company_menu, company) for company in companies_to_process]
                
                for future in concurrent.futures.as_completed(futures):
                    try:
                        future.result()
                    except Exception as e:
                        logger.error(f"Error processing company: {e}")
            
            logger.info(f"Data refresh complete. Processed {len(companies_to_process)} companies.")
            
        except Exception as e:
            logger.error(f"Error during data refresh: {e}")

    def get_companies_to_process(self, companies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Determine which companies need processing based on cache"""
        companies_to_process = []
        
        for company in companies:
            company_id = str(company['id'])
            
            # Check if we have this company in cache
            if company_id not in self.menu_cache:
                companies_to_process.append(company)
                continue
            
            # Could add more sophisticated cache invalidation logic here
            # For now, process all companies to ensure data freshness
            companies_to_process.append(company)
        
        return companies_to_process

    def fetch_companies(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Fetch companies with timeout and error handling"""
        try:
            response = requests.get(
                f"{self.api_url}/companies", 
                params=filters,
                timeout=15  # Reduced timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"API Error fetching companies: {e}")
            return []

    def download_pdf(self, company_id: int) -> bytes:
        """Download PDF with timeout and error handling"""
        try:
            response = requests.get(
                f"{self.api_url}/companies/{company_id}/menu",
                timeout=20  # Reduced timeout
            )
            response.raise_for_status()
            return response.content
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                raise ValueError("Menu not found")
            raise
        except Exception as e:
            logger.error(f"Download PDF error: {e}")
            raise

    @lru_cache(maxsize=1000)
    def remove_diacritics(self, text: str) -> str:
        """Remove diacritics from text with caching"""
        return ''.join(
            c for c in unicodedata.normalize('NFKD', text)
            if not unicodedata.combining(c)
        )

    def extract_dishes(self, pdf_content: bytes) -> List[Tuple[str, str]]:
        """Optimized dish extraction with early termination"""
        dishes = []
        max_dishes = 100  # Limit to prevent memory issues
        
        try:
            with pdfplumber.open(BytesIO(pdf_content)) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    if page_num > 5:  # Limit pages processed
                        break
                    
                    # Extract text with simpler settings
                    text = page.extract_text()
                    if not text:
                        continue
                    
                    # Split text into lines
                    lines = text.split('\n')
                    
                    # Pattern to detect dish lines
                    price_pattern = r'(\d+[\.,]\d{1,2}|\d+)\s*(?:lei|ron)?\b'
                    
                    for line in lines:
                        if len(dishes) >= max_dishes:
                            break
                        
                        line = line.strip()
                        if not line or len(line) < 3:
                            continue
                            
                        # Skip obvious non-dish lines
                        if re.search(r'\b(g|ml|kg|cm|mm|tel|email|www)\b', line, re.IGNORECASE):
                            continue
                            
                        # Skip allergen information
                        if re.search(r'conține|alergeni|ingrediente', line, re.IGNORECASE):
                            continue
                            
                        # Try to extract price
                        price_match = re.search(price_pattern, line)
                        if price_match:
                            price = price_match.group()
                            dish_name = re.sub(price_pattern, '', line).strip()
                            dish_name = re.sub(r'[:\-–•]+$', '', dish_name).strip()
                        else:
                            dish_name = line
                            price = ""
                        
                        # Final validation
                        if dish_name and len(dish_name) > 2:
                            normalized = self.remove_diacritics(dish_name)
                            dishes.append((dish_name, price, normalized))
        
        except Exception as e:
            logger.error(f"Extract dishes error: {e}")
        
        return dishes

    def process_company_menu(self, company: Dict[str, Any]):
        """Process and store menu with optimizations"""
        company_id = str(company['id'])
        
        try:
            pdf_content = self.download_pdf(company['id'])
            dishes = self.extract_dishes(pdf_content)
            self.menu_cache[company_id] = dishes
            
            # Skip if no dishes found
            if not dishes:
                logger.info(f"No dishes found for company {company_id}")
                return
            
            # Prepare documents for insertion (batch processing)
            documents = []
            metadatas = []
            ids = []
            
            for i, (dish, price, normalized) in enumerate(dishes):
                doc_id = f"{company_id}_{i}"
                metadata = {
                    "company_id": company_id,
                    "company_name": company.get('name', '')[:50],  # Limit field length
                    "address": company.get('address', '')[:100],
                    "category": company.get('category', '')[:50],
                    "price": price,
                    "dish": dish[:100],  # Limit field length
                    "normalized": normalized[:100]
                }
                
                documents.append(normalized)
                metadatas.append(metadata)
                ids.append(doc_id)
            
            # Create embeddings in smaller batches
            batch_size = 32
            for i in range(0, len(documents), batch_size):
                batch_docs = documents[i:i+batch_size]
                batch_metas = metadatas[i:i+batch_size]
                batch_ids = ids[i:i+batch_size]
                
                # Create embeddings
                embeddings = self.embedding_model.encode(batch_docs, batch_size=16).tolist()
                
                # Add to ChromaDB collection
                self.collection.add(
                    embeddings=embeddings,
                    documents=batch_docs,
                    metadatas=batch_metas,
                    ids=batch_ids
                )
            
            logger.info(f"Processed {len(dishes)} dishes for company {company_id}")
            
        except ValueError as e:  # Menu not found
            self.menu_cache[company_id] = []
            logger.info(f"Menu not found for company {company_id}: {e}")
        except Exception as e:
            logger.error(f"Process company menu error for {company_id}: {e}")
            self.menu_cache[company_id] = []

    def classify_query(self, query: str) -> str:
        """Optimized query classification"""
        normalized = self.remove_diacritics(query).lower()
        
        # Use simpler patterns for better performance
        if any(word in normalized for word in ['salut', 'buna', 'hello']):
            return "greeting"
        
        if any(word in normalized for word in ['preparat', 'mancare', 'pizza', 'burger']):
            return "dish"
        
        if any(word in normalized for word in ['restaurant', 'unde', 'loc']):
            return "restaurant"
        
        return "general"

    def normalize_query(self, query: str) -> str:
        """Optimized query normalization"""
        normalized = self.remove_diacritics(query)
        words = re.findall(r'\w+', normalized.lower())
        
        # Filter stop words more efficiently
        clean_words = [
            word for word in words 
            if word not in self.normalized_stop_words and len(word) > 1
        ]
        
        return " ".join(clean_words)

    def find_matches(self, dish_query: str, threshold: float = 0.4) -> List[Dict[str, Any]]:
        """Optimized vector similarity search"""
        normalized_query = self.remove_diacritics(dish_query.lower())
        
        # Create embedding
        query_embedding = self.embedding_model.encode(normalized_query).tolist()
        
        # Query with reduced result set
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=10,  # Reduced from 20
            include=["documents", "metadatas"]
        )
        
        # Process results with early termination
        matches = []
        seen_companies = set()
        
        for doc, meta in zip(results['documents'][0], results['metadatas'][0]):
            if len(matches) >= 5:  # Early termination
                break
                
            company_id = meta['company_id']
            if company_id in seen_companies:
                continue
                
            seen_companies.add(company_id)
            
            # Get company data
            company = next((c for c in self.company_data if str(c['id']) == company_id), None)
            if not company:
                continue
                
            if self.is_relevant_match(normalized_query, doc, threshold):
                matches.append({
                    "company": company,
                    "dish": meta.get('dish', doc),
                    "price": meta.get('price', '')
                })
        
        return matches

    def is_relevant_match(self, query: str, dish: str, threshold: float) -> bool:
        """Optimized relevance matching"""
        query_words = set(query.split())
        dish_words = set(dish.lower().split())
        
        if not query_words:
            return False
            
        matching_words = len(query_words.intersection(dish_words))
        return matching_words / len(query_words) >= threshold

    def generate_response(self, query: str) -> str:
        """Generate response with caching"""
        query_type = self.classify_query(query)
        cache_key = self.get_cache_key(query, query_type)
        
        # Check cache first
        cached_response = self.get_cached_response(cache_key)
        if cached_response:
            return cached_response
        
        # Generate new response
        try:
            normalized = self.normalize_query(query)
            context = self.generate_context(query_type, normalized)
            
            # Use appropriate template
            if query_type == "dish":
                template = self.dish_template
                response = template.format(query=normalized, options=context)
            elif query_type == "restaurant":
                template = self.restaurant_template
                response = template.format(query=normalized, options=context)
            else:
                response = f"Pentru '{query}', iată ce pot sugera:\n{context}"
            
            # Generate AI response
            ai_response = self.llm.invoke(response)
            
            # Cache the response
            self.set_cached_response(cache_key, ai_response)
            
            return ai_response
            
        except Exception as e:
            logger.error(f"Generate response error: {e}")
            return "Îmi pare rău, am întâmpinat o problemă. Te rog să încerci din nou."

    def generate_context(self, query_type: str, query: str) -> str:
        """Generate context with limits"""
        if query_type == "dish":
            matches = self.find_matches(query, threshold=0.3)
            if matches:
                return "\n".join(
                    f"{m['company']['name']}: {m['dish']}" + 
                    (f" - {m['price']}" if m['price'] else "")
                    for m in matches[:3]  # Limit to 3 results
                )
        elif query_type == "restaurant":
            # Simplified restaurant matching
            matches = [c for c in self.company_data if query in c.get('name', '').lower()][:3]
            return "\n".join(
                f"{m['name']} ({m.get('category', '')})"
                for m in matches
            )
        
        return "Nu am găsit informații specifice pentru cererea ta."

    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        return {
            "companies_cached": len(self.menu_cache),
            "total_companies": len(self.company_data),
            "chroma_collection_count": self.collection.count(),
            "memory_cache_size": len(self.response_cache),
            "redis_connected": self.redis_client is not None,
        }

# Example usage
if __name__ == "__main__":
    # Initialize with optimized settings
    recommender = OptimizedAIRecommender(
        dotnet_api_url="http://localhost:5298",
        max_workers=2,  # Reduced workers
        refresh_minutes=120  # Less frequent refresh
    )
    
    # Test query
    response = recommender.generate_response("Vreau pizza")
    print(f"Response: {response}")
    
    # Print stats
    stats = recommender.get_stats()
    print(f"Stats: {stats}")