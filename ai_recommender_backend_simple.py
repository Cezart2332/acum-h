import os
import json
import time
import re
import requests
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass
from threading import Lock
import unicodedata
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("Redis not available - running without caching")

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    from sklearn.metrics.pairwise import cosine_similarity
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("ML libraries not available - using keyword search only")

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
    latitude: float
    longitude: float
    cui: int

@dataclass
class Event:
    id: int
    title: str
    description: str
    photo: str
    tags: List[str]
    likes: int
    company: str
    company_id: int

class EnhancedAIRecommenderBackendSimple:
    def __init__(
        self,
        backend_url: str,
        redis_config: Optional[Dict[str, Any]] = None,
        embedding_model: str = "all-MiniLM-L6-v2",
        cache_ttl: int = 3600,
        max_results: int = 10,
        request_timeout: int = 30
    ):
        """
        Simplified AI Recommender with C# Backend integration (no OpenAI required)
        
        Args:
            backend_url: URL of the C# backend API
            redis_config: Redis configuration for caching
            embedding_model: Sentence transformer model for embeddings
            cache_ttl: Cache time-to-live in seconds
            max_results: Maximum results to return
            request_timeout: HTTP request timeout in seconds
        """
        self.backend_url = backend_url.rstrip('/')
        self.cache_ttl = cache_ttl
        self.max_results = max_results
        self.request_timeout = request_timeout
        self.data_lock = Lock()
        
        # Initialize Redis cache
        self.redis_client = None
        if redis_config and REDIS_AVAILABLE:
            try:
                self.redis_client = redis.Redis(**redis_config)
                self.redis_client.ping()
                logger.info("Redis cache connected successfully")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")
        
        # Initialize embedding model (optional)
        self.embedding_model = None
        if ML_AVAILABLE:
            try:
                self.embedding_model = SentenceTransformer(embedding_model)
                logger.info(f"Loaded embedding model: {embedding_model}")
            except Exception as e:
                logger.warning(f"Failed to load embedding model: {e}")
                logger.info("Will use keyword search only")
        else:
            logger.info("ML libraries not available - using keyword search only")
        
        # Cache for embeddings and data
        self.embeddings_cache = {}
        self.data_cache = {
            'restaurants': [],
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
        
        logger.info("Enhanced AI Recommender (Backend, Simplified) initialized successfully")
    
    def make_request(self, endpoint: str, method: str = 'GET', data: Optional[Dict] = None) -> Optional[Dict]:
        """Make HTTP request to C# backend"""
        try:
            url = f"{self.backend_url}{endpoint}"
            
            if method.upper() == 'GET':
                response = requests.get(url, timeout=self.request_timeout)
            elif method.upper() == 'POST':
                if data:
                    response = requests.post(url, json=data, timeout=self.request_timeout)
                else:
                    response = requests.post(url, timeout=self.request_timeout)
            else:
                logger.error(f"Unsupported HTTP method: {method}")
                return None
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request to {endpoint} failed: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response from {endpoint}: {e}")
            return None
    
    def get_cache_key(self, prefix: str, query: str) -> str:
        """Generate cache key"""
        normalized_query = self.normalize_text(query)
        return f"ai_recommender_backend_simple:{prefix}:{hash(normalized_query)}"
    
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
        """Refresh all data from C# backend"""
        with self.data_lock:
            try:
                # Fetch companies (restaurants)
                companies_response = self.make_request('/companies')
                if companies_response:
                    self.data_cache['restaurants'] = [
                        Restaurant(
                            id=company['id'],
                            name=company['name'] or '',
                            category=company['category'] or '',
                            address=company['address'] or '',
                            description=company['description'] or '',
                            rating=5.0,  # Default rating since it's not in the backend
                            contact=company['email'] or '',
                            image=company['profileImage'] or '',
                            tags=company['tags'] or [],
                            latitude=company['latitude'] or 0.0,
                            longitude=company['longitude'] or 0.0,
                            cui=company['cui'] or 0
                        )
                        for company in companies_response
                    ]
                else:
                    logger.warning("Failed to fetch companies from backend")
                    self.data_cache['restaurants'] = []
                
                # Fetch events
                events_response = self.make_request('/events')
                if events_response:
                    self.data_cache['events'] = [
                        Event(
                            id=event['id'],
                            title=event['title'] or '',
                            description=event['description'] or '',
                            photo=event['photo'] or '',
                            tags=event['tags'] or [],
                            likes=event['likes'] or 0,
                            company=event['company'] or '',
                            company_id=0  # We'll need to map this if needed
                        )
                        for event in events_response
                    ]
                else:
                    logger.warning("Failed to fetch events from backend")
                    self.data_cache['events'] = []
                
                self.data_cache['last_updated'] = datetime.now()
                
                # Update embeddings cache if ML is available
                if ML_AVAILABLE and self.embedding_model:
                    self.update_embeddings_cache()
                
                logger.info(f"Data refreshed from backend: {len(self.data_cache['restaurants'])} restaurants, "
                           f"{len(self.data_cache['events'])} events")
                
            except Exception as e:
                logger.error(f"Data refresh failed: {e}")
    
    def update_embeddings_cache(self):
        """Update embeddings cache for semantic search"""
        if not ML_AVAILABLE or not self.embedding_model:
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
            
            # Create embeddings for events
            event_texts = [
                f"{e.title} {e.description} {' '.join(e.tags)}"
                for e in self.data_cache['events']
            ]
            
            if event_texts:
                event_embeddings = self.embedding_model.encode(event_texts)
                self.embeddings_cache['events'] = event_embeddings
                
            logger.info("Embeddings cache updated successfully")
            
        except Exception as e:
            logger.error(f"Embeddings cache update failed: {e}")
    
    def get_company_menu(self, company_id: int) -> Optional[bytes]:
        """Get menu PDF for a specific company"""
        try:
            url = f"{self.backend_url}/companies/{company_id}/menu"
            response = requests.get(url, timeout=self.request_timeout)
            
            if response.status_code == 200:
                return response.content
            else:
                return None
                
        except Exception as e:
            logger.error(f"Failed to get menu for company {company_id}: {e}")
            return None
    
    def get_company_events(self, company_id: int) -> List[Event]:
        """Get events for a specific company"""
        try:
            response = self.make_request('/companyevents', 'POST', {'id': company_id})
            if response:
                return [
                    Event(
                        id=event['id'],
                        title=event['title'] or '',
                        description=event['description'] or '',
                        photo=event['photo'] or '',
                        tags=event.get('tags', []),
                        likes=event['likes'] or 0,
                        company=event['company'] or '',
                        company_id=company_id
                    )
                    for event in response
                ]
            return []
        except Exception as e:
            logger.error(f"Failed to get events for company {company_id}: {e}")
            return []
    
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
                'restaurante', 'cafenea', 'bar', 'pub', 'braserie', 'companie'
            ],
            'food_search': [
                'mancare', 'preparat', 'fel', 'pizza', 'pasta', 'burger', 'salata',
                'supa', 'desert', 'dulce', 'bautura', 'ce sa mananc', 'vreau sa mananc', 'meniu'
            ],
            'event_search': [
                'eveniment', 'concert', 'spectacol', 'festival', 'petrecere',
                'ce se intampla', 'evenimente', 'ce fac', 'distractie'
            ],
            'location_search': [
                'aproape', 'langa', 'distanta', 'unde', 'locatie', 'adresa'
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
        """Perform semantic search using embeddings (if available)"""
        if not ML_AVAILABLE or not self.embedding_model or search_type not in self.embeddings_cache:
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
            elif search_type == 'events':
                items = self.data_cache['events']
            else:
                return []
            
            for item in items:
                # Create searchable text based on item type
                if search_type == 'restaurants':
                    searchable_text = f"{item.name} {item.category} {item.description} {' '.join(item.tags)}"
                elif search_type == 'events':
                    searchable_text = f"{item.title} {item.description} {' '.join(item.tags)}"
                
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
    
    def search_all(self, query: str) -> Dict[str, List]:
        """Search all data types using both semantic and keyword search"""
        all_results = {
            'restaurants': [],
            'events': []
        }
        
        try:
            # Semantic search (if available)
            if ML_AVAILABLE and self.embedding_model:
                semantic_restaurants = self.semantic_search(query, 'restaurants', self.max_results)
                semantic_events = self.semantic_search(query, 'events', self.max_results)
                
                all_results['restaurants'].extend(semantic_restaurants)
                all_results['events'].extend(semantic_events)
            
            # Keyword search (always available)
            keyword_restaurants = self.keyword_search(query, 'restaurants', self.max_results)
            keyword_events = self.keyword_search(query, 'events', self.max_results)
            
            # Merge results and deduplicate
            seen_restaurant_ids = set()
            merged_restaurants = []
            for result in all_results['restaurants'] + keyword_restaurants:
                if result['item'].id not in seen_restaurant_ids:
                    seen_restaurant_ids.add(result['item'].id)
                    merged_restaurants.append(result)
            
            seen_event_ids = set()
            merged_events = []
            for result in all_results['events'] + keyword_events:
                if result['item'].id not in seen_event_ids:
                    seen_event_ids.add(result['item'].id)
                    merged_events.append(result)
            
            all_results['restaurants'] = merged_restaurants[:self.max_results]
            all_results['events'] = merged_events[:self.max_results]
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
        
        return all_results
    
    def generate_rule_based_response(self, query: str, intent: str, search_results: Dict[str, List]) -> str:
        """Generate rule-based response (no OpenAI needed)"""
        try:
            restaurants = search_results.get('restaurants', [])
            events = search_results.get('events', [])
            
            if intent == 'greeting':
                return "Salut! Sunt aici să te ajut cu recomandări de restaurante și evenimente. Ce te interesează?"
            
            elif intent == 'restaurant_search' or intent == 'food_search':
                if restaurants:
                    response = "Iată câteva opțiuni interessante:\n\n"
                    for i, result in enumerate(restaurants[:3], 1):
                        restaurant = result['item']
                        response += f"{i}. **{restaurant.name}**\n"
                        response += f"   📍 {restaurant.address}\n"
                        response += f"   🏷️ {restaurant.category}\n"
                        if restaurant.description:
                            response += f"   📝 {restaurant.description}\n"
                        response += "\n"
                    return response
                else:
                    return "Nu am găsit restaurante care să se potrivească cu căutarea ta. Te rog să încerci cu alți termeni."
            
            elif intent == 'event_search':
                if events:
                    response = "Iată evenimentele care te-ar putea interesa:\n\n"
                    for i, result in enumerate(events[:3], 1):
                        event = result['item']
                        response += f"{i}. **{event.title}**\n"
                        response += f"   🏢 {event.company}\n"
                        if event.description:
                            response += f"   📝 {event.description}\n"
                        response += f"   👍 {event.likes} like-uri\n"
                        response += "\n"
                    return response
                else:
                    return "Nu am găsit evenimente care să se potrivească cu căutarea ta. Te rog să încerci cu alți termeni."
            
            elif intent == 'recommendation':
                if restaurants and events:
                    response = "Iată recomandările mele:\n\n"
                    response += "🍽️ **Restaurante:**\n"
                    for restaurant in restaurants[:2]:
                        response += f"• {restaurant['item'].name} - {restaurant['item'].category}\n"
                    response += "\n🎉 **Evenimente:**\n"
                    for event in events[:2]:
                        response += f"• {event['item'].title} - {event['item'].company}\n"
                    return response
                elif restaurants:
                    response = "Iată restaurantele pe care le recomand:\n\n"
                    for restaurant in restaurants[:3]:
                        response += f"• {restaurant['item'].name} - {restaurant['item'].category}\n"
                    return response
                elif events:
                    response = "Iată evenimentele pe care le recomand:\n\n"
                    for event in events[:3]:
                        response += f"• {event['item'].title} - {event['item'].company}\n"
                    return response
                else:
                    return "Nu am găsit recomandări specifice. Te rog să-mi spui ce anume te interesează."
            
            else:
                # General response
                total_results = len(restaurants) + len(events)
                if total_results > 0:
                    response = f"Am găsit {total_results} rezultate pentru căutarea ta:\n\n"
                    if restaurants:
                        response += f"🍽️ {len(restaurants)} restaurante\n"
                    if events:
                        response += f"🎉 {len(events)} evenimente\n"
                    response += "\nPoți să-mi spui mai specific ce te interesează?"
                    return response
                else:
                    return "Nu am găsit rezultate pentru căutarea ta. Te rog să încerci cu alți termeni."
        
        except Exception as e:
            logger.error(f"Rule-based response generation failed: {e}")
            return "Îmi pare rău, am întâmpinat o problemă în generarea răspunsului."
    
    def get_chat_response(self, query: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get complete chat response"""
        try:
            start_time = time.time()
            
            # Classify intent
            intent = self.classify_intent(query)
            
            # Search for relevant data
            search_results = self.search_all(query)
            
            # Generate response (rule-based only)
            response_text = self.generate_rule_based_response(query, intent, search_results)
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Prepare structured response
            response = {
                'query': query,
                'intent': intent,
                'response': response_text,
                'search_results': {
                    'restaurants': [
                        {
                            'id': result['item'].id,
                            'name': result['item'].name,
                            'category': result['item'].category,
                            'address': result['item'].address,
                            'description': result['item'].description,
                            'rating': result['item'].rating,
                            'image': result['item'].image,
                            'tags': result['item'].tags,
                            'relevance_score': result.get('similarity', result.get('score', 0))
                        }
                        for result in search_results.get('restaurants', [])
                    ],
                    'events': [
                        {
                            'id': result['item'].id,
                            'title': result['item'].title,
                            'description': result['item'].description,
                            'company': result['item'].company,
                            'photo': result['item'].photo,
                            'tags': result['item'].tags,
                            'likes': result['item'].likes,
                            'relevance_score': result.get('similarity', result.get('score', 0))
                        }
                        for result in search_results.get('events', [])
                    ]
                },
                'metadata': {
                    'response_time': response_time,
                    'timestamp': datetime.now().isoformat(),
                    'user_id': user_id,
                    'data_freshness': self.data_cache['last_updated'].isoformat() if self.data_cache['last_updated'] else None,
                    'ml_enabled': ML_AVAILABLE and self.embedding_model is not None,
                    'cache_enabled': self.redis_client is not None
                }
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Chat response generation failed: {e}")
            return {
                'query': query,
                'intent': 'error',
                'response': "Îmi pare rău, am întâmpinat o problemă tehnică. Te rog să încerci din nou.",
                'search_results': {'restaurants': [], 'events': []},
                'metadata': {
                    'response_time': 0,
                    'timestamp': datetime.now().isoformat(),
                    'user_id': user_id,
                    'error': str(e)
                }
            }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of the AI system"""
        try:
            # Test backend connection
            backend_status = "healthy"
            try:
                companies_response = self.make_request('/companies')
                if not companies_response:
                    backend_status = "unhealthy"
            except:
                backend_status = "unhealthy"
            
            # Check data freshness
            data_age = None
            if self.data_cache['last_updated']:
                data_age = (datetime.now() - self.data_cache['last_updated']).total_seconds()
            
            return {
                'status': 'healthy' if backend_status == 'healthy' else 'degraded',
                'backend_connection': backend_status,
                'data_cache': {
                    'restaurants_count': len(self.data_cache['restaurants']),
                    'events_count': len(self.data_cache['events']),
                    'last_updated': self.data_cache['last_updated'].isoformat() if self.data_cache['last_updated'] else None,
                    'data_age_seconds': data_age
                },
                'embedding_model': ML_AVAILABLE and self.embedding_model is not None,
                'openai_enabled': False,  # Always False in simplified version
                'redis_cache': self.redis_client is not None,
                'ml_available': ML_AVAILABLE,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }