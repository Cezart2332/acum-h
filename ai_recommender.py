import requests
import pdfplumber
import re
import concurrent.futures
import threading
import time
import os
import chromadb
import unicodedata
from io import BytesIO
from typing import List, Dict, Any, Tuple
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer
from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate

class AIRecommender:
    def __init__(
        self,
        dotnet_api_url: str,
        ollama_host: str = "http://localhost:11434",
        llm_model: str = "mistral",
        max_workers: int = 3,
        cache_dir: str = "chroma_cache",
        refresh_minutes: int = 60
    ):
        self.api_url = dotnet_api_url.rstrip("/")
        self.ollama_host = ollama_host
        self.llm_model = llm_model
        self.max_workers = max_workers
        self.cache_dir = cache_dir
        self.refresh_minutes = refresh_minutes
        
        # Initialize ChromaDB
        self.chroma_client = chromadb.PersistentClient(path=cache_dir)
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        self.collection = self.chroma_client.get_or_create_collection(
            name="restaurant_menus",
            embedding_function=self.embedding_fn
        )
        
        # Local embedding model
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize Mistral LLM
        self.llm = Ollama(
            base_url=ollama_host,
            model=llm_model,
            temperature=0.7,
            system=(
                "Ești un asistent expert în recomandări de restaurante și preparate culinare. "
                "Răspunzi într-un mod prietenos, conversațional și folosești emoji pentru a fi mai atractiv. "
                "Limba principală este română. Fii concis dar informativ."
            )
        )
        
        # Define conversation templates
        self.dish_template = ChatPromptTemplate.from_messages([
            ("system", "Ești un expert culinar care ajută oamenii să găsească preparate specifice."),
            ("human", "Utilizatorul caută: {query}\n\nIată opțiunile găsite:\n{options}\n\nTe rog să răspunzi într-un mod prietenos și util:")
        ])
        
        self.restaurant_template = ChatPromptTemplate.from_messages([
            ("system", "Ești un concierge de restaurante care oferă recomandări personalizate."),
            ("human", "Utilizatorul vrea: {query}\n\nIată restaurantele relevante:\n{options}\n\nTe rog să oferi un răspuns prietenos:")
        ])
        
        self.general_template = ChatPromptTemplate.from_messages([
            ("system", "Ești un asistent amabil de restaurante cu cunoștințe extinse despre oraș."),
            ("human", "Utilizatorul întreabă: {query}\n\nFolosește aceste informații dacă sunt relevante:\n{context}\n\nRăspunde într-un mod conversațional:")
        ])
        
        # Expanded stop words for query normalization
        self.stop_words = {
            "unde", "pot", "sa", "să", "găsesc", "gasesc", "care", "ce", "cu", "la", 
            "un", "o", "exista", "aveti", "imi", "doresc", "vreau", "caut", "vad",
            "loc", "locul", "locuri", "mi", "ne", "vă", "le", "și", "sau", "pentru",
            "in", "în", "pe", "la", "cu", "de", "despre", "ca", "că", "este", "sunt",
            "era", "au", "fi", "fost", "fie", "fara", "fără", "dar", "din", "dintre",
            "dupa", "după", "pentru", "prin", "pana", "până", "catre", "către", "peste",
            "sub", "spre", "intre", "între", "asupra", "contra", "impotriva", "împotriva",
            "desi", "deși", "daca", "dacă", "deci", "caci", "căci", "da", "nu", "poate",
            "cam", "prea", "foarte", "mai", "mult", "putin", "puțin", "atât", "atat", "cât",
            "cat", "câtva", "catva", "câți", "cati", "câte", "cate", "cât", "cat", "câteva",
            "cateva", "atâta", "atata", "atâția", "atatia", "atatea", "acest", "această",
            "aceste", "acela", "aceea", "aceia", "acestui", "acestei", "acestora", "acelasi",
            "același", "astfel", "atare", "acel", "aceeași", "alt", "alta", "alte", "altul",
            "alții", "altele", "altceva", "altcineva", "niste", "niște", "vreun", "vreo",
            "vrun", "vru", "niciun", "nici", "o", "unii", "unele", "unor", "various", "diverse",
            "fel", "tip", "gen", "sort", "specie", "lua", "bea", "mânca", "servi", "cumpăra",
            "vedea", "găsi", "recomanda", "sugera", "cere", "dori", "putea", "trebui", "incerca",
            "încerca", "părea", "ajuta", "cred", "gând", "ști", "stiu", "crede", "considera",
            "parere", "părere", "punct", "vedere", "privire", "datorita", "datorită", "grație",
            "mulțumită", "conform", "potrivit", "asemenea", "similar", "ca", "ca", "si", "ori",
            "fie", "respectiv", "respectivi", "etc", "altele", "altfel", "altminteri", "dealtfel",
            "insa", "însă", "totusi", "totuși", "ci", "doar", "numai", "pur", "simplu", "aproape",
            "aproape", "cam", "relativ", "destul", "destul", "destul", "foarte", "extrem", "teribil",
            "excesiv", "prea", "mai", "mult", "mult", "putin", "puțin", "deloc", "absolut", "complet",
            "total", "parțial", "parţial", "parțial", "aproximativ", "circa", "câtva", "citiva", "câțiva"
        }
        # Precompute normalized stop words
        self.normalized_stop_words = {self.remove_diacritics(word) for word in self.stop_words}
        
        # Initialize data structures
        self.company_data = []
        self.menu_cache = {}
        
        # Load or refresh data
        self.refresh_data()
        
        # Start background refresh thread
        self.refresh_thread = threading.Thread(target=self.auto_refresh, daemon=True)
        self.refresh_thread.start()

    def auto_refresh(self):
        """Background thread to periodically refresh data"""
        while True:
            time.sleep(self.refresh_minutes * 60)
            print(f"Auto-refreshing menu data...")
            self.refresh_data()

    def refresh_data(self):
        """Refresh all company and menu data"""
        try:
            # Step 1: Fetch all companies
            companies = self.fetch_companies()
            if not companies:
                print("No companies found in API response")
                return
                
            self.company_data = companies
            
            # Clear existing data
            self.collection.delete(where={"id": {"$ne": "-1"}})
            
            # Step 2: Process all menus in parallel
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = [executor.submit(self.process_company_menu, company) for company in companies]
                
                for future in concurrent.futures.as_completed(futures):
                    try:
                        future.result()
                    except Exception as e:
                        print(f"Error processing company: {e}")
            
            print(f"Data refresh complete. Processed {len(companies)} companies.")
            
        except Exception as e:
            print(f"Error during data refresh: {e}")

    def fetch_companies(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        try:
            response = requests.get(
                f"{self.api_url}/companies", 
                params=filters,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"[fetch_companies] API Error: {e}")
            return []

    def download_pdf(self, company_id: int) -> bytes:
        try:
            response = requests.get(
                f"{self.api_url}/companies/{company_id}/menu",
                timeout=30
            )
            response.raise_for_status()
            return response.content
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                raise ValueError("Menu not found")
            raise
        except Exception as e:
            print(f"[download_pdf] Error: {e}")
            raise

    def remove_diacritics(self, text: str) -> str:
        """Remove diacritics from text while preserving original case"""
        return ''.join(
            c for c in unicodedata.normalize('NFKD', text)
            if not unicodedata.combining(c)
        )

    def extract_dishes(self, pdf_content: bytes) -> List[Tuple[str, str]]:
        """Robust dish extraction from PDF with diacritic normalization"""
        dishes = []
        try:
            with pdfplumber.open(BytesIO(pdf_content)) as pdf:
                for page in pdf.pages:
                    # Extract text with layout preservation
                    text = page.extract_text(layout=True, x_tolerance=1, y_tolerance=1)
                    if not text:
                        continue
                    
                    # Split text into lines
                    lines = text.split('\n')
                    
                    # Pattern to detect dish lines
                    price_pattern = r'(\d+[\.,]\d{1,2}|\d+)\s*(?:lei|ron|€|euro)?\b'
                    
                    for line in lines:
                        line = line.strip()
                        if not line:
                            continue
                            
                        # Skip lines that are clearly not dishes (measurements)
                        if re.search(r'\b(g|ml|kg|cm|mm)\b', line, re.IGNORECASE):
                            continue
                            
                        # Skip allergen information
                        if re.search(r'conține|alergeni|ingrediente', line, re.IGNORECASE):
                            continue
                            
                        # Try to extract price
                        price_match = re.search(price_pattern, line)
                        if price_match:
                            price = price_match.group()
                            # Remove price from dish name
                            dish_name = re.sub(price_pattern, '', line).strip()
                            # Clean trailing special characters
                            dish_name = re.sub(r'[:\-–•]+$', '', dish_name).strip()
                        else:
                            dish_name = line
                            price = ""
                        
                        # Final validation
                        if dish_name and len(dish_name) > 2:
                            # Create normalized version without diacritics
                            normalized = self.remove_diacritics(dish_name)
                            dishes.append((dish_name, price, normalized))
        
        except Exception as e:
            print(f"[extract_dishes] Error: {e}")
        return dishes

    def process_company_menu(self, company: Dict[str, Any]):
        """Process and store menu in vector database"""
        company_id = str(company['id'])
        
        try:
            pdf_content = self.download_pdf(company['id'])
            dishes = self.extract_dishes(pdf_content)
            self.menu_cache[company_id] = dishes
            
            # Prepare documents for insertion
            documents = []
            metadatas = []
            ids = []
            
            for i, (dish, price, normalized) in enumerate(dishes):
                doc_id = f"{company_id}_{i}"
                metadata = {
                    "company_id": company_id,
                    "company_name": company.get('name', ''),
                    "address": company.get('address', ''),
                    "category": company.get('category', ''),
                    "price": price,
                    "dish": dish,
                    "normalized": normalized
                }
                
                # Use normalized version for embedding
                documents.append(normalized)
                metadatas.append(metadata)
                ids.append(doc_id)
            
            # Skip if no documents
            if not documents:
                print(f"No dishes found for company {company_id}")
                return
                
            # Create embeddings
            embeddings = self.embedding_model.encode(documents).tolist()
            
            # Add to ChromaDB collection
            self.collection.add(
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
        except ValueError as e:  # Menu not found
            self.menu_cache[company_id] = []
            print(f"Menu not found for company {company_id}: {e}")
        except Exception as e:
            print(f"[process_company_menu] Error for {company_id}: {e}")
            self.menu_cache[company_id] = []

    def classify_query(self, query: str) -> str:
        """Improved query classification with more categories"""
        normalized = self.remove_diacritics(query).lower()
        
        # Greeting patterns
        if re.search(r'\b(salut|buna|hello|hei|ce faci)\b', normalized):
            return "greeting"
        
        # Dish patterns
        dish_keywords = r'\b(preparat|fel|mancare|dulce|gustare|bautura|desert|aperitiv|mic dejun|pizza|paste|burger|salata|supa)\b'
        if re.search(dish_keywords, normalized) or any(w in normalized for w in [" vreau ", "doresc ", "caut ", "as manca "]):
            return "dish"
        
        # Restaurant patterns
        restaurant_keywords = r'\b(restaurant|restaurație|cafenea|bar|pub|berărie|cofetărie|patiserie|brasserie|bistro|terasa|local|locatie)\b'
        if re.search(restaurant_keywords, normalized) or any(w in normalized for w in ["unde pot", "loc cu", "recomanzi", "sugereaza"]):
            return "restaurant"
        
        # Category patterns
        category_keywords = r'\b(italian|mexican|asiatic|romanesc|vegetarian|vegan|rapid|deserturi|mic dejun|seara|cu familie)\b'
        if re.search(category_keywords, normalized):
            return "category"
        
        # General restaurant questions
        if any(w in normalized for w in ["deschis", "program", "ore", "contact", "telefon", "adresa", "recomandari", "sugestii"]):
            return "general"
        
        return "general"

    def normalize_query(self, query: str) -> str:
        """Normalize query by removing diacritics and irrelevant words"""
        # Remove diacritics
        normalized = self.remove_diacritics(query)
        
        # Tokenize and filter
        words = re.findall(r'\w+', normalized.lower())
        clean_words = [
            word for word in words 
            if word not in self.normalized_stop_words 
            and len(word) > 1
            and not word.isdigit()
        ]
        
        return " ".join(clean_words)

    def find_matches(self, dish_query: str, threshold: float = 0.4) -> List[Dict[str, Any]]:
        """Find matches using vector similarity search with diacritic normalization"""
        # Normalize the query
        normalized_query = self.remove_diacritics(dish_query.lower())
        
        # Embed the normalized query
        query_embedding = self.embedding_model.encode(normalized_query).tolist()
        
        # Query the collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=20,
            include=["documents", "metadatas"]
        )
        
        # Process results
        matches = []
        seen_companies = set()
        
        for doc, meta in zip(results['documents'][0], results['metadatas'][0]):
            company_id = meta['company_id']
            
            # Skip if we've already seen this company
            if company_id in seen_companies:
                continue
                
            seen_companies.add(company_id)
            
            # Get full company data
            company = next((c for c in self.company_data if str(c['id']) == company_id), None)
            if not company:
                continue
                
            # Check if we should include this match
            if self.is_relevant_match(normalized_query, doc, threshold):
                matches.append({
                    "company": company,
                    "dish": meta.get('dish', doc),  # Use original dish name
                    "price": meta.get('price', '')
                })
        
        return matches

    def is_relevant_match(self, query: str, dish: str, threshold: float) -> bool:
        """Flexible matching based on word inclusion"""
        # Both query and dish are already normalized and without diacritics
        query_words = set(query.split())
        dish_words = set(dish.lower().split())
        
        # Count how many query words are in the dish
        matching_words = sum(1 for word in query_words if word in dish_words)
        
        # Calculate match ratio
        match_ratio = matching_words / len(query_words) if query_words else 0
        
        return match_ratio >= threshold

    def find_restaurants(self, attributes: List[str], threshold: int = 1) -> List[Dict[str, Any]]:
        """Find restaurants matching attribute keywords"""
        matches = []
        seen_company_ids = set()
        
        for company in self.company_data:
            score = 0
            norm_name = self.remove_diacritics(company.get('name', '')).lower()
            norm_category = self.remove_diacritics(company.get('category', '')).lower()
            norm_address = self.remove_diacritics(company.get('address', '')).lower()
            norm_description = self.remove_diacritics(company.get('description', '')).lower()
            
            # Score matches in different fields
            for attr in attributes:
                if attr in norm_name:
                    score += 3  # Highest weight for name matches
                if attr in norm_category:
                    score += 2
                if attr in norm_address:
                    score += 1
                if attr in norm_description:
                    score += 1
            
            # Add if meets threshold and not duplicate
            if score >= threshold and company['id'] not in seen_company_ids:
                matches.append(company)
                seen_company_ids.add(company['id'])
        
        return matches

    def find_by_category(self, category_query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Find restaurants by category with semantic matching"""
        # Normalize category
        normalized_category = self.remove_diacritics(category_query).lower()
        
        # Map common variations to standard categories
        category_map = {
            "cafea": ["cafenea", "cofetărie"],
            "bere": ["pub", "berărie"],
            "mic dejun": ["brunch", "patiserie"],
            "cină": ["seara", "restaurant"],
            "rapid": ["fast-food", "sandwich"],
            "desert": ["cofetărie", "patiserie", "înghețată"],
            "românesc": ["tradițional", "local"]
        }
        
        # Find matching categories
        matches = []
        for company in self.company_data:
            company_category = self.remove_diacritics(company.get('category', '')).lower()
            
            # Direct match
            if normalized_category in company_category:
                matches.append(company)
                continue
                
            # Mapped match
            for query_term, valid_terms in category_map.items():
                if normalized_category == query_term and any(t in company_category for t in valid_terms):
                    matches.append(company)
        
        return matches[:limit]

    def generate_context(self, query_type: str, query: str) -> str:
        """Generate context for LLM based on query type"""
        normalized = self.normalize_query(query)
        
        if query_type == "dish":
            matches = self.find_matches(normalized, threshold=0.3)
            if matches:
                return "\n".join(
                    f"{m['company']['name']} ({m['company']['address']}): {m['dish']} - {m['price'] or 'fără preț'}"
                    for m in matches[:5]
                )
            return self.search_menus(normalized)
        
        elif query_type == "restaurant":
            attributes = normalized.split()
            matches = self.find_restaurants(attributes)[:5]
            return "\n".join(
                f"{m['name']} ({m['address']}): {m.get('category', '')}"
                for m in matches
            )
        
        elif query_type == "category":
            matches = self.find_by_category(normalized)[:5]
            return "\n".join(
                f"{m['name']} ({m['address']}): {m.get('category', '')}"
                for m in matches
            )
        
        # General context - using available fields
        if not self.company_data:
            return "Nu există restaurante în baza de date."
        
        # Use sample of restaurants
        sample_restaurants = self.company_data[:5]
        return "Exemple de restaurante:\n" + "\n".join(
            f"- {r['name']} ({r.get('category', '')}): {r.get('address', '')}"
            for r in sample_restaurants
        )

    def search_menus(self, dish_query: str) -> str:
        """Manual search through menus for relevant dishes with diacritic handling"""
        # Normalize the query
        normalized_query = self.remove_diacritics(dish_query.lower())
        results = []
        
        for company in self.company_data:
            company_id = str(company['id'])
            dishes = self.menu_cache.get(company_id, [])
            
            relevant_dishes = []
            for dish, price, normalized_dish in dishes:
                # Compare normalized versions
                if normalized_query in normalized_dish.lower():
                    relevant_dishes.append((dish, price))
            
            if relevant_dishes:
                results.append({
                    "company": company,
                    "dishes": relevant_dishes
                })
        
        if not results:
            return f"Nu am găsite preparate pentru '{dish_query}'"
        
        # Format results for context
        return "\n".join(
            f"{res['company']['name']} ({res['company']['address']}): " + 
            ", ".join(f"{d[0]} - {d[1]}" for d in res['dishes'][:3])
            for res in results[:3]
        )

    def generate_response(self, query: str) -> str:
        """Generate human-like response using Mistral LLM"""
        try:
            # Classify query type
            query_type = self.classify_query(query)
            print(f"Query type: {query_type}, Query: '{query}'")
            
            # Special handling for greetings
            if query_type == "greeting":
                return "Bună ziua! 😊 Cu ce vă pot ajuta astăzi? Căutați un restaurant specific, un preparat, sau recomandări generale?"
            
            # Generate context based on query type
            context = self.generate_context(query_type, query)
            
            # Prepare LLM chain based on query type
            if query_type == "dish":
                chain = self.dish_template | self.llm
                return chain.invoke({
                    "query": query,
                    "options": context
                })
            
            elif query_type in ["restaurant", "category"]:
                chain = self.restaurant_template | self.llm
                return chain.invoke({
                    "query": query,
                    "options": context
                })
            
            # General questions
            chain = self.general_template | self.llm
            return chain.invoke({
                "query": query,
                "context": context
            })
            
        except Exception as e:
            print(f"Error generating response: {e}")
            return "Am întâmpinat o problemă la procesarea cererii. Vă rugăm reformulați întrebarea."
