import os
import json
import time
import re
import mysql.connector
from typing import List, Dict, Any, Optional
import openai
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass
from threading import Lock
import unicodedata
import redis
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Restaurant:
    id: int
    name: str
    category: str
    address: str
    description: str
    rating: float
    contact: str
    image: str
    tags: List[str]

@dataclass
class MenuItem:
    id: int
    restaurant_id: int
    name: str
    description: str
    price: float
    category: str
    ingredients: List[str]
    is_available: bool

@dataclass
class Event:
    id: int
    title: str
    description: str
    date: str
    location: str
    image: str
    category: str
    tags: List[str]

class EnhancedAIRecommender:
    def __init__(
        self,
        mysql_config: Dict[str, Any],
        redis_config: Optional[Dict[str, Any]] = None,
        openai_api_key: Optional[str] = None,
        embedding_model: str = "all-MiniLM-L6-v2",
        cache_ttl: int = 3600,
        max_results: int = 10
    ):
        """
        Enhanced AI Recommender with MySQL integration and natural language processing
        
        Args:
            mysql_config: Database configuration
            redis_config: Redis configuration for caching
            openai_api_key: OpenAI API key for GPT responses
            embedding_model: Sentence transformer model for embeddings
            cache_ttl: Cache time-to-live in seconds
            max_results: Maximum results to return
        """
        self.mysql_config = mysql_config
        self.cache_ttl = cache_ttl
        self.max_results = max_results
        self.data_lock = Lock()
        
        # Initialize MySQL connection
        self.mysql_connection = None
        self.connect_to_mysql()
        
        # Initialize Redis cache
        self.redis_client = None
        if redis_config:
            try:
                self.redis_client = redis.Redis(**redis_config)
                self.redis_client.ping()
                logger.info("Redis cache connected successfully")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")
        
        # Initialize OpenAI
        if openai_api_key:
            openai.api_key = openai_api_key
            self.use_openai = True
        else:
            self.use_openai = False
            logger.info("OpenAI API key not provided, using rule-based responses")
        
        # Initialize embedding model
        try:
            self.embedding_model = SentenceTransformer(embedding_model)
            logger.info(f"Loaded embedding model: {embedding_model}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.embedding_model = None
        
        # Cache for embeddings and data
        self.embeddings_cache = {}
        self.data_cache = {
            'restaurants': [],
            'menu_items': [],
            'events': [],
            'last_updated': None
        }
        
        # Romanian diacritics mapping
        self.diacritics_map = {
            'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ț': 't',
            'Ă': 'A', 'Â': 'A', 'Î': 'I', 'Ș': 'S', 'Ț': 'T'
        }
        
        # Initialize data
        self.refresh_data()
        
        logger.info("Enhanced AI Recommender initialized successfully")
    
    def connect_to_mysql(self):
        """Establish MySQL connection with retry logic"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                self.mysql_connection = mysql.connector.connect(
                    **self.mysql_config,
                    charset='utf8mb4',
                    use_unicode=True,
                    autocommit=True
                )
                logger.info("MySQL connection established")
                return
            except mysql.connector.Error as e:
                logger.error(f"MySQL connection attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute MySQL query with connection recovery"""
        try:
            cursor = self.mysql_connection.cursor(dictionary=True)
            cursor.execute(query, params)
            results = cursor.fetchall()
            cursor.close()
            return results
        except mysql.connector.Error as e:
            logger.error(f"Query execution failed: {e}")
            # Try to reconnect
            self.connect_to_mysql()
            cursor = self.mysql_connection.cursor(dictionary=True)
            cursor.execute(query, params)
            results = cursor.fetchall()
            cursor.close()
            return results
    
    def get_cache_key(self, prefix: str, query: str) -> str:
        """Generate cache key"""
        normalized_query = self.normalize_text(query)
        return f"ai_recommender:{prefix}:{hash(normalized_query)}"
    
    def get_from_cache(self, key: str) -> Optional[Any]:
        """Get data from Redis cache"""
        if not self.redis_client:
            return None
        try:
            cached_data = self.redis_client.get(key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
        return None
    
    def set_cache(self, key: str, data: Any, ttl: Optional[int] = None):
        """Set data in Redis cache"""
        if not self.redis_client:
            return
        try:
            ttl = ttl or self.cache_ttl
            self.redis_client.setex(key, ttl, json.dumps(data, ensure_ascii=False))
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    def normalize_text(self, text: str) -> str:
        """Normalize Romanian text by removing diacritics and converting to lowercase"""
        if not text:
            return ""
        
        # Remove diacritics
        normalized = text
        for diacritic, replacement in self.diacritics_map.items():
            normalized = normalized.replace(diacritic, replacement)
        
        # Additional normalization
        normalized = unicodedata.normalize('NFKD', normalized)
        normalized = ''.join(c for c in normalized if not unicodedata.combining(c))
        
        return normalized.lower().strip()
    
    def refresh_data(self):
        """Refresh all data from MySQL"""
        with self.data_lock:
            try:
                # Fetch restaurants
                restaurants_query = """
                    SELECT r.*, 
                           GROUP_CONCAT(DISTINCT t.name) as tags
                    FROM restaurants r
                    LEFT JOIN restaurant_tags rt ON r.id = rt.restaurant_id
                    LEFT JOIN tags t ON rt.tag_id = t.id
                    WHERE r.is_active = 1
                    GROUP BY r.id
                """
                restaurant_rows = self.execute_query(restaurants_query)
                
                self.data_cache['restaurants'] = [
                    Restaurant(
                        id=row['id'],
                        name=row['name'] or '',
                        category=row['category'] or '',
                        address=row['address'] or '',
                        description=row['description'] or '',
                        rating=float(row['rating']) if row['rating'] else 0.0,
                        contact=row['contact'] or '',
                        image=row['image'] or '',
                        tags=row['tags'].split(',') if row['tags'] else []
                    )
                    for row in restaurant_rows
                ]
                
                # Fetch menu items
                menu_query = """
                    SELECT m.*, r.name as restaurant_name
                    FROM menu_items m
                    JOIN restaurants r ON m.restaurant_id = r.id
                    WHERE m.is_available = 1 AND r.is_active = 1
                """
                menu_rows = self.execute_query(menu_query)
                
                self.data_cache['menu_items'] = [
                    MenuItem(
                        id=row['id'],
                        restaurant_id=row['restaurant_id'],
                        name=row['name'] or '',
                        description=row['description'] or '',
                        price=float(row['price']) if row['price'] else 0.0,
                        category=row['category'] or '',
                        ingredients=row['ingredients'].split(',') if row['ingredients'] else [],
                        is_available=bool(row['is_available'])
                    )
                    for row in menu_rows
                ]
                
                # Fetch events
                events_query = """
                    SELECT e.*, 
                           GROUP_CONCAT(DISTINCT t.name) as tags
                    FROM events e
                    LEFT JOIN event_tags et ON e.id = et.event_id
                    LEFT JOIN tags t ON et.tag_id = t.id
                    WHERE e.is_active = 1
                    GROUP BY e.id
                    ORDER BY e.date DESC
                """
                event_rows = self.execute_query(events_query)
                
                self.data_cache['events'] = [
                    Event(
                        id=row['id'],
                        title=row['title'] or '',
                        description=row['description'] or '',
                        date=row['date'].isoformat() if row['date'] else '',
                        location=row['location'] or '',
                        image=row['image'] or '',
                        category=row['category'] or '',
                        tags=row['tags'].split(',') if row['tags'] else []
                    )
                    for row in event_rows
                ]
                
                self.data_cache['last_updated'] = datetime.now()
                
                # Update embeddings cache
                self.update_embeddings_cache()
                
                logger.info(f"Data refreshed: {len(self.data_cache['restaurants'])} restaurants, "
                           f"{len(self.data_cache['menu_items'])} menu items, "
                           f"{len(self.data_cache['events'])} events")
                
            except Exception as e:
                logger.error(f"Data refresh failed: {e}")
    
    def update_embeddings_cache(self):
        """Update embeddings cache for semantic search"""
        if not self.embedding_model:
            return
        
        try:
            # Create embeddings for restaurants
            restaurant_texts = [
                f"{r.name} {r.category} {r.description} {' '.join(r.tags)}"
                for r in self.data_cache['restaurants']
            ]
            
            if restaurant_texts:
                restaurant_embeddings = self.embedding_model.encode(restaurant_texts)
                self.embeddings_cache['restaurants'] = restaurant_embeddings
            
            # Create embeddings for menu items
            menu_texts = [
                f"{m.name} {m.description} {m.category} {' '.join(m.ingredients)}"
                for m in self.data_cache['menu_items']
            ]
            
            if menu_texts:
                menu_embeddings = self.embedding_model.encode(menu_texts)
                self.embeddings_cache['menu_items'] = menu_embeddings
            
            # Create embeddings for events
            event_texts = [
                f"{e.title} {e.description} {e.category} {' '.join(e.tags)}"
                for e in self.data_cache['events']
            ]
            
            if event_texts:
                event_embeddings = self.embedding_model.encode(event_texts)
                self.embeddings_cache['events'] = event_embeddings
                
            logger.info("Embeddings cache updated successfully")
            
        except Exception as e:
            logger.error(f"Embeddings cache update failed: {e}")
    
    def classify_intent(self, query: str) -> str:
        """Classify user intent from query"""
        normalized_query = self.normalize_text(query)
        
        # Define intent patterns
        intent_patterns = {
            'greeting': [
                'salut', 'buna', 'hello', 'hei', 'ce faci', 'buna ziua', 'buna seara'
            ],
            'restaurant_search': [
                'restaurant', 'unde sa mananc', 'loc de mancare', 'recomanzi un restaurant',
                'restaurante', 'cafenea', 'bar', 'pub', 'braserie'
            ],
            'food_search': [
                'mancare', 'preparat', 'fel', 'pizza', 'pasta', 'burger', 'salata',
                'supa', 'desert', 'dulce', 'bautura', 'ce sa mananc', 'vreau sa mananc'
            ],
            'event_search': [
                'eveniment', 'concert', 'spectacol', 'festival', 'petrecere',
                'ce se intampla', 'evenimente', 'ce fac', 'distractie'
            ],
            'price_inquiry': [
                'cat costa', 'pret', 'pretul', 'ieftin', 'scump', 'buget'
            ],
            'recommendation': [
                'recomanzi', 'sugerezi', 'propui', 'ce imi recomanzi', 'ce e bun'
            ]
        }
        
        # Score intents
        intent_scores = {}
        for intent, patterns in intent_patterns.items():
            score = sum(1 for pattern in patterns if pattern in normalized_query)
            if score > 0:
                intent_scores[intent] = score
        
        # Return highest scoring intent
        if intent_scores:
            return max(intent_scores, key=intent_scores.get)
        
        return 'general'
    
    def semantic_search(self, query: str, search_type: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Perform semantic search using embeddings"""
        if not self.embedding_model or search_type not in self.embeddings_cache:
            return []
        
        try:
            # Encode query
            query_embedding = self.embedding_model.encode([query])
            
            # Get cached embeddings
            cached_embeddings = self.embeddings_cache[search_type]
            
            # Calculate similarities
            similarities = cosine_similarity(query_embedding, cached_embeddings)[0]
            
            # Get top results
            top_indices = np.argsort(similarities)[::-1][:limit]
            
            results = []
            for idx in top_indices:
                if similarities[idx] > 0.3:  # Threshold for relevance
                    if search_type == 'restaurants':
                        item = self.data_cache['restaurants'][idx]
                    elif search_type == 'menu_items':
                        item = self.data_cache['menu_items'][idx]
                    elif search_type == 'events':
                        item = self.data_cache['events'][idx]
                    else:
                        continue
                    
                    results.append({
                        'item': item,
                        'similarity': float(similarities[idx])
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []
    
    def keyword_search(self, query: str, search_type: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Perform keyword-based search"""
        normalized_query = self.normalize_text(query)
        query_words = set(normalized_query.split())
        
        results = []
        
        try:
            if search_type == 'restaurants':
                items = self.data_cache['restaurants']
            elif search_type == 'menu_items':
                items = self.data_cache['menu_items']
            elif search_type == 'events':
                items = self.data_cache['events']
            else:
                return []
            
            for item in items:
                # Create searchable text based on item type
                if search_type == 'restaurants':
                    searchable_text = f"{item.name} {item.category} {item.description} {' '.join(item.tags)}"
                elif search_type == 'menu_items':
                    searchable_text = f"{item.name} {item.description} {item.category} {' '.join(item.ingredients)}"
                elif search_type == 'events':
                    searchable_text = f"{item.title} {item.description} {item.category} {' '.join(item.tags)}"
                
                normalized_text = self.normalize_text(searchable_text)
                text_words = set(normalized_text.split())
                
                # Calculate keyword overlap
                matching_words = query_words.intersection(text_words)
                if matching_words:
                    score = len(matching_words) / len(query_words)
                    results.append({
                        'item': item,
                        'score': score
                    })
            
            # Sort by score and return top results
            results.sort(key=lambda x: x['score'], reverse=True)
            return results[:limit]
            
        except Exception as e:
            logger.error(f"Keyword search failed: {e}")
            return []
    
    def generate_natural_response(self, query: str, intent: str, search_results: Dict[str, List]) -> str:
        """Generate natural language response"""
        
        # Check cache first
        cache_key = self.get_cache_key("response", f"{intent}:{query}")
        cached_response = self.get_from_cache(cache_key)
        if cached_response:
            return cached_response
        
        try:
            if self.use_openai:
                response = self.generate_openai_response(query, intent, search_results)
            else:
                response = self.generate_rule_based_response(query, intent, search_results)
            
            # Cache the response
            self.set_cache(cache_key, response, ttl=1800)  # 30 minutes
            return response
            
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            return "Îmi pare rău, am întâmpinat o problemă tehnică. Te rog să încerci din nou."
    
    def generate_openai_response(self, query: str, intent: str, search_results: Dict[str, List]) -> str:
        """Generate response using OpenAI GPT"""
        
        # Prepare context
        context = self.prepare_context(search_results)
        
        system_prompt = """
        Ești un asistent AI prietenos și expert în recomandări pentru restaurante, mâncare și evenimente din România.
        Răspunzi întotdeauna în română, folosind un ton conversațional și prietenos.
        Folosește emoji-uri pentru a face răspunsurile mai atractive.
        Fii concis dar informativ.
        """
        
        user_prompt = f"""
        Utilizatorul a întrebat: "{query}"
        Intenția detectată: {intent}
        
        Informații relevante:
        {context}
        
        Te rog să oferi un răspuns util și prietenos în română.
        """
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return self.generate_rule_based_response(query, intent, search_results)
    
    def generate_rule_based_response(self, query: str, intent: str, search_results: Dict[str, List]) -> str:
        """Generate rule-based response"""
        
        emojis = ["🍽️", "🍕", "🍔", "🥗", "🎉", "🏪", "⭐", "📍", "💰", "🔥"]
        
        if intent == 'greeting':
            return f"Bună ziua! 😊 Sunt aici să te ajut să găsești cele mai bune restaurante, preparate și evenimente! Cu ce te pot ajuta?"
        
        elif intent == 'restaurant_search':
            restaurants = search_results.get('restaurants', [])
            if restaurants:
                response = f"Iată câteva restaurante recomandate pentru tine: 🍽️\n\n"
                for result in restaurants[:3]:
                    restaurant = result['item']
                    response += f"⭐ **{restaurant.name}**\n"
                    response += f"📍 {restaurant.address}\n"
                    response += f"🏪 {restaurant.category}\n"
                    if restaurant.rating > 0:
                        response += f"⭐ Rating: {restaurant.rating:.1f}\n"
                    response += f"📝 {restaurant.description[:100]}...\n\n"
                return response
            else:
                return "Nu am găsit restaurante care să se potrivească cu cererea ta. 😔 Poți încerca să cauți cu alți termeni?"
        
        elif intent == 'food_search':
            menu_items = search_results.get('menu_items', [])
            if menu_items:
                response = f"Am găsit aceste preparate delicioase pentru tine: 🍕\n\n"
                for result in menu_items[:3]:
                    item = result['item']
                    # Get restaurant name
                    restaurant = next((r for r in self.data_cache['restaurants'] if r.id == item.restaurant_id), None)
                    restaurant_name = restaurant.name if restaurant else "Restaurant necunoscut"
                    
                    response += f"🔥 **{item.name}**\n"
                    response += f"🏪 La {restaurant_name}\n"
                    if item.price > 0:
                        response += f"💰 {item.price:.2f} RON\n"
                    response += f"📝 {item.description}\n\n"
                return response
            else:
                return "Nu am găsit preparate care să se potrivească cu cererea ta. 😔 Încearcă să cauți cu alți termeni!"
        
        elif intent == 'event_search':
            events = search_results.get('events', [])
            if events:
                response = f"Iată evenimente interesante pentru tine: 🎉\n\n"
                for result in events[:3]:
                    event = result['item']
                    response += f"🎊 **{event.title}**\n"
                    response += f"📅 {event.date}\n"
                    response += f"📍 {event.location}\n"
                    response += f"📝 {event.description[:100]}...\n\n"
                return response
            else:
                return "Nu am găsit evenimente care să se potrivească cu cererea ta. 😔 Încearcă să cauți cu alți termeni!"
        
        elif intent == 'recommendation':
            # Provide general recommendations
            restaurants = self.data_cache['restaurants'][:3]
            if restaurants:
                response = f"Iată câteva recomandări excelente: ⭐\n\n"
                for restaurant in restaurants:
                    response += f"🍽️ **{restaurant.name}** ({restaurant.category})\n"
                    response += f"📍 {restaurant.address}\n"
                    if restaurant.rating > 0:
                        response += f"⭐ Rating: {restaurant.rating:.1f}\n"
                    response += "\n"
                return response
            else:
                return "Nu am recomandări disponibile momentan. 😔"
        
        else:
            return f"Te înțeleg! 😊 Poți să fii mai specific cu ce cauți - restaurant, mâncare, sau evenimente? Sunt aici să te ajut!"
    
    def prepare_context(self, search_results: Dict[str, List]) -> str:
        """Prepare context for AI response"""
        context_parts = []
        
        # Add restaurant context
        if search_results.get('restaurants'):
            context_parts.append("Restaurante găsite:")
            for result in search_results['restaurants'][:3]:
                restaurant = result['item']
                context_parts.append(f"- {restaurant.name} ({restaurant.category}): {restaurant.address}")
        
        # Add menu items context
        if search_results.get('menu_items'):
            context_parts.append("Preparate găsite:")
            for result in search_results['menu_items'][:3]:
                item = result['item']
                restaurant = next((r for r in self.data_cache['restaurants'] if r.id == item.restaurant_id), None)
                restaurant_name = restaurant.name if restaurant else "Restaurant necunoscut"
                context_parts.append(f"- {item.name} la {restaurant_name}: {item.price} RON")
        
        # Add events context
        if search_results.get('events'):
            context_parts.append("Evenimente găsite:")
            for result in search_results['events'][:3]:
                event = result['item']
                context_parts.append(f"- {event.title}: {event.date} la {event.location}")
        
        return "\n".join(context_parts) if context_parts else "Nu am găsit informații relevante."
    
    def search_all(self, query: str) -> Dict[str, List]:
        """Search across all data types"""
        results = {}
        
        # Semantic search if available
        if self.embedding_model:
            results['restaurants'] = self.semantic_search(query, 'restaurants')
            results['menu_items'] = self.semantic_search(query, 'menu_items')
            results['events'] = self.semantic_search(query, 'events')
        
        # Fallback to keyword search
        if not any(results.values()):
            results['restaurants'] = self.keyword_search(query, 'restaurants')
            results['menu_items'] = self.keyword_search(query, 'menu_items')
            results['events'] = self.keyword_search(query, 'events')
        
        return results
    
    def get_chat_response(self, query: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Main method to get chat response"""
        
        start_time = time.time()
        
        try:
            # Classify intent
            intent = self.classify_intent(query)
            
            # Search for relevant data
            search_results = self.search_all(query)
            
            # Generate natural response
            response = self.generate_natural_response(query, intent, search_results)
            
            # Prepare response data
            response_data = {
                'response': response,
                'intent': intent,
                'search_results': {
                    'restaurants': [
                        {
                            'id': r['item'].id,
                            'name': r['item'].name,
                            'category': r['item'].category,
                            'address': r['item'].address,
                            'rating': r['item'].rating,
                            'similarity': r.get('similarity', r.get('score', 0))
                        }
                        for r in search_results.get('restaurants', [])
                    ],
                    'menu_items': [
                        {
                            'id': m['item'].id,
                            'name': m['item'].name,
                            'description': m['item'].description,
                            'price': m['item'].price,
                            'restaurant_id': m['item'].restaurant_id,
                            'similarity': m.get('similarity', m.get('score', 0))
                        }
                        for m in search_results.get('menu_items', [])
                    ],
                    'events': [
                        {
                            'id': e['item'].id,
                            'title': e['item'].title,
                            'description': e['item'].description,
                            'date': e['item'].date,
                            'location': e['item'].location,
                            'similarity': e.get('similarity', e.get('score', 0))
                        }
                        for e in search_results.get('events', [])
                    ]
                },
                'processing_time': time.time() - start_time,
                'timestamp': datetime.now().isoformat()
            }
            
            return response_data
            
        except Exception as e:
            logger.error(f"Chat response generation failed: {e}")
            return {
                'response': "Îmi pare rău, am întâmpinat o problemă tehnică. Te rog să încerci din nou.",
                'intent': 'error',
                'search_results': {'restaurants': [], 'menu_items': [], 'events': []},
                'processing_time': time.time() - start_time,
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get system health status"""
        return {
            'mysql_connected': self.mysql_connection.is_connected() if self.mysql_connection else False,
            'redis_connected': self.redis_client.ping() if self.redis_client else False,
            'embedding_model_loaded': self.embedding_model is not None,
            'openai_enabled': self.use_openai,
            'data_last_updated': self.data_cache['last_updated'].isoformat() if self.data_cache['last_updated'] else None,
            'restaurants_count': len(self.data_cache['restaurants']),
            'menu_items_count': len(self.data_cache['menu_items']),
            'events_count': len(self.data_cache['events'])
        }

# Example usage and configuration
if __name__ == "__main__":
    # Configuration
    mysql_config = {
        'host': 'localhost',
        'user': 'root',
        'password': 'password',
        'database': 'restaurant_db'
    }
    
    redis_config = {
        'host': 'localhost',
        'port': 6379,
        'db': 0
    }
    
    # Initialize AI recommender
    ai_recommender = EnhancedAIRecommender(
        mysql_config=mysql_config,
        redis_config=redis_config,
        openai_api_key=os.getenv('OPENAI_API_KEY')
    )
    
    # Test queries
    test_queries = [
        "Salut! Ce faci?",
        "Vreau să mănânc pizza",
        "Recomanzi-mi un restaurant italian",
        "Ce evenimente sunt în weekend?",
        "Unde găsesc cea mai bună mâncare românească?"
    ]
    
    for query in test_queries:
        print(f"\nQuery: {query}")
        response = ai_recommender.get_chat_response(query)
        print(f"Response: {response['response']}")
        print(f"Intent: {response['intent']}")
        print(f"Processing time: {response['processing_time']:.2f}s")