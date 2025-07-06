import json
import time
import re
import requests
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SmartChatbot:
    def __init__(self, backend_url: str):
        """
        Smart ChatGPT-like chatbot with database integration
        """
        self.backend_url = backend_url.rstrip('/')
        self.conversation_context = {}
        self.user_preferences = {}
        
        # Romanian response templates for natural conversation
        self.response_templates = {
            'greeting': [
                "Salut! 👋 Mă bucur să te văd! Sunt aici să te ajut să găsești cele mai bune restaurante și evenimente din oraș. Cu ce te pot ajuta?",
                "Bună ziua! 😊 Sunt asistentul tău personal pentru restaurante și evenimente. Poți să-mi spui ce anume cauți?",
                "Hei! 🌟 Sunt gata să te ajut să descoperi locuri minunate de mâncare sau evenimente interesante. Ce te interesează?",
            ],
            'restaurant_general': [
                "Pentru restaurante, am acces la o bază de date actualizată cu {count} locuri. Poți să-mi spui ce fel de mâncare preferi sau în ce zonă cauți?",
                "Excelent! Am informații despre {count} restaurante din orașul nostru. Ce anume te-ar interesa - poate un anumit tip de bucătărie sau o zonă specifică?",
                "Perfect! În baza mea de date am {count} restaurante. Ai vreo preferință pentru tipul de mâncare sau bugetul pe care îl ai în minte?",
            ],
            'restaurant_specific': [
                "Am găsit {count} restaurante care se potrivesc cu ceea ce cauți:",
                "Iată {count} opțiuni excelente pentru tine:",
                "Based pe preferințele tale, îți recomand aceste {count} restaurante:",
            ],
            'event_general': [
                "Fantastic! Am informații despre {count} evenimente în curs. Ce tip de evenimente te interesează - poate concerte, spectacole sau evenimente culturale?",
                "Perfect timing! În baza mea de date sunt {count} evenimente. Ai vreo preferință pentru tipul de eveniment sau data?",
                "Minunat! Am {count} evenimente disponibile. Vrei să afli despre evenimente într-un anumit weekend sau poate un gen specific?",
            ],
            'event_specific': [
                "Am găsit {count} evenimente care ar putea să-ți placă:",
                "Iată {count} evenimente interesante pentru tine:",
                "Based pe ce ai căutat, îți propun aceste {count} evenimente:",
            ],
            'no_results': [
                "Din păcate, nu am găsit nimic specific pentru ceea ce cauți, dar îți pot arăta alte opțiuni similare din baza de date.",
                "Nu am găsit exact ceea ce cauți, dar am alte sugestii care s-ar putea să-ți placă.",
                "Pentru momentul nu am rezultate exacte, dar îți pot recomanda alternative care ar putea fi interesante.",
            ],
            'help': [
                "Pot să te ajut cu multe lucruri! Îți pot recomanda restaurante, găsi evenimente interesante, sau îți pot da detalii despre locuri specifice. Doar spune-mi ce te interesează!",
                "Sunt aici pentru a te ajuta să găsești: restaurante și cafenele, evenimente și spectacole, informații despre meniuri și prețuri. Ce anume vrei să afli?",
                "Pot să-ți ofer recomandări personalizate pentru restaurante și evenimente. De asemenea, pot să îți dau detalii despre locuri specifice. Cu ce începem?",
            ]
        }
        
        # Context patterns for better understanding
        self.context_patterns = {
            'cuisine_types': ['italian', 'românesc', 'chinezesc', 'indian', 'mexican', 'frantuzesc', 'american', 'grec', 'turcesc'],
            'meal_times': ['mic dejun', 'prânz', 'cină', 'brunch', 'gustare'],
            'event_types': ['concert', 'spectacol', 'festival', 'petrecere', 'conferință', 'expoziție'],
            'locations': ['centru', 'zona veche', 'mall', 'aproape', 'lângă'],
            'price_ranges': ['ieftin', 'scump', 'mediu', 'buget', 'luxos'],
        }
        
        # Load initial data
        self.refresh_data()
    
    def refresh_data(self):
        """Load fresh data from backend"""
        try:
            # Try to fetch companies
            response = requests.get(f"{self.backend_url}/companies", timeout=10)
            if response.status_code == 200:
                self.restaurants = response.json()
            else:
                self.restaurants = []
            
            # Try to fetch events
            response = requests.get(f"{self.backend_url}/events", timeout=10)
            if response.status_code == 200:
                self.events = response.json()
            else:
                self.events = []
                
            logger.info(f"Data loaded: {len(self.restaurants)} restaurants, {len(self.events)} events")
            
        except Exception as e:
            logger.warning(f"Backend unavailable: {e}")
            # Use mock data when backend is unavailable
            self.restaurants = self.get_mock_restaurants()
            self.events = self.get_mock_events()
            logger.info("Using mock data since backend is unavailable")
    
    def get_mock_restaurants(self):
        """Return mock restaurant data when backend is unavailable"""
        return [
            {
                "id": 1,
                "name": "La Mama",
                "category": "Românesc",
                "address": "Str. Republicii nr. 15",
                "description": "Restaurant traditional românesc cu mâncăruri casnice delicioase",
                "email": "contact@lamama.ro",
                "profileImage": "",
                "tags": ["traditional", "românesc", "casnic"],
                "latitude": 45.7494,
                "longitude": 21.2272,
                "cui": 12345678
            },
            {
                "id": 2,
                "name": "Pizza Bella",
                "category": "Italian",
                "address": "Bulevardul Revoluției nr. 42",
                "description": "Pizzerie autentică cu ingrediente proaspete aduse din Italia",
                "email": "info@pizzabella.ro",
                "profileImage": "",
                "tags": ["pizza", "italian", "proaspăt"],
                "latitude": 45.7578,
                "longitude": 21.2270,
                "cui": 87654321
            },
            {
                "id": 3,
                "name": "Sushi Zen",
                "category": "Japonez",
                "address": "Str. Eminescu nr. 8",
                "description": "Restaurant japonez cu sushi proaspăt pregătit de maeștri",
                "email": "contact@sushizen.ro",
                "profileImage": "",
                "tags": ["sushi", "japonez", "fresh"],
                "latitude": 45.7528,
                "longitude": 21.2285,
                "cui": 11223344
            }
        ]
    
    def get_mock_events(self):
        """Return mock event data when backend is unavailable"""
        return [
            {
                "id": 1,
                "title": "Concert Rock în Centrul Vechi",
                "description": "Seară de rock cu cele mai bune trupe locale",
                "company": "Rock Club Timișoara",
                "photo": "",
                "tags": ["rock", "muzică", "concert"],
                "likes": 127
            },
            {
                "id": 2,
                "title": "Festival de Artă Stradală",
                "description": "Trei zile de spectacole de artă stradală și performanțe",
                "company": "Primăria Timișoara",
                "photo": "",
                "tags": ["artă", "festival", "stradal"],
                "likes": 89
            },
            {
                "id": 3,
                "title": "Noaptea Muzeelor",
                "description": "Intrare gratuită la toate muzeele din oraș",
                "company": "Consiliul Județean",
                "photo": "",
                "tags": ["muzee", "cultură", "gratuit"],
                "likes": 203
            }
        ]
    
    def extract_entities(self, query: str) -> Dict[str, List[str]]:
        """Extract entities from user query for better understanding"""
        query_lower = query.lower()
        entities = {
            'cuisine_types': [],
            'meal_times': [],
            'event_types': [],
            'locations': [],
            'price_ranges': []
        }
        
        for category, terms in self.context_patterns.items():
            for term in terms:
                if term in query_lower:
                    entities[category].append(term)
        
        return entities
    
    def analyze_intent_and_context(self, query: str, user_id: str = None) -> Dict[str, Any]:
        """Advanced intent analysis with context understanding"""
        query_lower = query.lower()
        entities = self.extract_entities(query)
        
        # Determine primary intent
        intent = 'general'
        confidence = 0.5
        
        # Greeting patterns
        greeting_patterns = ['salut', 'buna', 'hello', 'hei', 'ce faci', 'buna ziua']
        if any(pattern in query_lower for pattern in greeting_patterns):
            intent = 'greeting'
            confidence = 0.9
        
        # Restaurant/food patterns
        restaurant_patterns = ['restaurant', 'mancare', 'unde sa mananc', 'pizza', 'burger', 'meniu', 'bucatarie']
        if any(pattern in query_lower for pattern in restaurant_patterns):
            intent = 'restaurant_search'
            confidence = 0.8
        
        # Event patterns
        event_patterns = ['eveniment', 'concert', 'spectacol', 'festival', 'ce se intampla']
        if any(pattern in query_lower for pattern in event_patterns):
            intent = 'event_search'
            confidence = 0.8
        
        # Help patterns
        help_patterns = ['ajuta', 'help', 'ce poti face', 'cum functionezi']
        if any(pattern in query_lower for pattern in help_patterns):
            intent = 'help'
            confidence = 0.9
        
        return {
            'intent': intent,
            'confidence': confidence,
            'entities': entities,
            'query_length': len(query.split()),
            'has_question': '?' in query
        }
    
    def search_restaurants(self, query: str, entities: Dict[str, List[str]]) -> List[Dict[str, Any]]:
        """Search restaurants with entity-based filtering"""
        results = []
        query_lower = query.lower()
        
        for restaurant in self.restaurants:
            score = 0
            
            # Name matching
            if any(word in restaurant.get('name', '').lower() for word in query_lower.split()):
                score += 3
            
            # Category matching
            if any(word in restaurant.get('category', '').lower() for word in query_lower.split()):
                score += 2
            
            # Cuisine type matching
            for cuisine in entities.get('cuisine_types', []):
                if cuisine in restaurant.get('category', '').lower() or cuisine in restaurant.get('description', '').lower():
                    score += 2
            
            # Tag matching
            restaurant_tags = restaurant.get('tags', [])
            for tag in restaurant_tags:
                if any(word in tag.lower() for word in query_lower.split()):
                    score += 1
            
            # Description matching
            if any(word in restaurant.get('description', '').lower() for word in query_lower.split()):
                score += 1
            
            if score > 0:
                results.append({
                    'restaurant': restaurant,
                    'score': score
                })
        
        # Sort by score and return top results
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:5]
    
    def search_events(self, query: str, entities: Dict[str, List[str]]) -> List[Dict[str, Any]]:
        """Search events with entity-based filtering"""
        results = []
        query_lower = query.lower()
        
        for event in self.events:
            score = 0
            
            # Title matching
            if any(word in event.get('title', '').lower() for word in query_lower.split()):
                score += 3
            
            # Event type matching
            for event_type in entities.get('event_types', []):
                if event_type in event.get('title', '').lower() or event_type in event.get('description', '').lower():
                    score += 2
            
            # Tag matching
            event_tags = event.get('tags', [])
            for tag in event_tags:
                if any(word in tag.lower() for word in query_lower.split()):
                    score += 1
            
            # Description matching
            if any(word in event.get('description', '').lower() for word in query_lower.split()):
                score += 1
            
            if score > 0:
                results.append({
                    'event': event,
                    'score': score
                })
        
        # Sort by score and return top results
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:5]
    
    def generate_natural_response(self, context: Dict[str, Any], search_results: Dict[str, List]) -> str:
        """Generate natural, contextual responses like ChatGPT"""
        intent = context['intent']
        entities = context['entities']
        
        restaurant_results = search_results.get('restaurants', [])
        event_results = search_results.get('events', [])
        
        if intent == 'greeting':
            return random.choice(self.response_templates['greeting'])
        
        elif intent == 'help':
            return random.choice(self.response_templates['help'])
        
        elif intent == 'restaurant_search':
            if restaurant_results:
                response = random.choice(self.response_templates['restaurant_specific']).format(count=len(restaurant_results))
                
                # Add specific restaurant details
                for i, result in enumerate(restaurant_results[:3], 1):
                    restaurant = result['restaurant']
                    response += f"\n\n{i}. **{restaurant.get('name', 'N/A')}**"
                    response += f"\n   📍 {restaurant.get('address', 'Adresă nedisponibilă')}"
                    response += f"\n   🍽️ {restaurant.get('category', 'Categorie nedisponibilă')}"
                    if restaurant.get('description'):
                        response += f"\n   📝 {restaurant.get('description')[:100]}..."
                
                if len(restaurant_results) > 3:
                    response += f"\n\n...și încă {len(restaurant_results) - 3} opțiuni! Vrei să vezi mai multe detalii despre vreunul?"
                
                return response
            else:
                base_response = random.choice(self.response_templates['no_results'])
                general_response = random.choice(self.response_templates['restaurant_general']).format(count=len(self.restaurants))
                return f"{base_response}\n\n{general_response}"
        
        elif intent == 'event_search':
            if event_results:
                response = random.choice(self.response_templates['event_specific']).format(count=len(event_results))
                
                # Add specific event details
                for i, result in enumerate(event_results[:3], 1):
                    event = result['event']
                    response += f"\n\n{i}. **{event.get('title', 'N/A')}**"
                    response += f"\n   🏢 {event.get('company', 'Organizator nedisponibil')}"
                    if event.get('description'):
                        response += f"\n   📝 {event.get('description')[:100]}..."
                    response += f"\n   👍 {event.get('likes', 0)} like-uri"
                
                if len(event_results) > 3:
                    response += f"\n\n...și încă {len(event_results) - 3} evenimente! Vrei să afli mai multe despre vreunul?"
                
                return response
            else:
                base_response = random.choice(self.response_templates['no_results'])
                general_response = random.choice(self.response_templates['event_general']).format(count=len(self.events))
                return f"{base_response}\n\n{general_response}"
        
        else:
            # General response with data overview
            total_restaurants = len(self.restaurants)
            total_events = len(self.events)
            
            return f"Am înțeles întrebarea ta! În baza mea de date am {total_restaurants} restaurante și {total_events} evenimente. " \
                   f"Poți să fii mai specific despre ce anume cauți? De exemplu, poți să-mi spui ce fel de mâncare preferi " \
                   f"sau ce tip de eveniment te-ar interesa."
    
    def get_chat_response(self, query: str, user_id: str = None) -> Dict[str, Any]:
        """Main method to get chat response"""
        start_time = time.time()
        
        try:
            # Refresh data periodically
            current_time = datetime.now()
            if not hasattr(self, 'last_refresh') or (current_time - self.last_refresh).seconds > 300:
                self.refresh_data()
                self.last_refresh = current_time
            
            # Analyze context and intent
            context = self.analyze_intent_and_context(query, user_id)
            
            # Perform searches based on intent
            search_results = {
                'restaurants': [],
                'events': []
            }
            
            if context['intent'] in ['restaurant_search', 'general']:
                search_results['restaurants'] = self.search_restaurants(query, context['entities'])
            
            if context['intent'] in ['event_search', 'general']:
                search_results['events'] = self.search_events(query, context['entities'])
            
            # Generate natural response
            response = self.generate_natural_response(context, search_results)
            
            # Format results for frontend
            formatted_restaurants = []
            for result in search_results['restaurants'][:5]:
                restaurant = result['restaurant']
                formatted_restaurants.append({
                    'id': restaurant.get('id'),
                    'name': restaurant.get('name'),
                    'category': restaurant.get('category'),
                    'address': restaurant.get('address'),
                    'description': restaurant.get('description'),
                    'rating': 4.5,  # Default rating
                    'image': restaurant.get('profileImage', ''),
                    'tags': restaurant.get('tags', []),
                    'relevance_score': result['score'] / 10.0
                })
            
            formatted_events = []
            for result in search_results['events'][:5]:
                event = result['event']
                formatted_events.append({
                    'id': event.get('id'),
                    'title': event.get('title'),
                    'description': event.get('description'),
                    'company': event.get('company'),
                    'photo': event.get('photo', ''),
                    'tags': event.get('tags', []),
                    'likes': event.get('likes', 0),
                    'relevance_score': result['score'] / 10.0
                })
            
            processing_time = time.time() - start_time
            
            return {
                'success': True,
                'response': response,
                'intent': context['intent'],
                'confidence': context['confidence'],
                'search_results': {
                    'restaurants': formatted_restaurants,
                    'events': formatted_events
                },
                'metadata': {
                    'response_time': processing_time,
                    'timestamp': datetime.now().isoformat(),
                    'user_id': user_id,
                    'entities_found': context['entities'],
                    'data_freshness': self.last_refresh.isoformat() if hasattr(self, 'last_refresh') else None
                }
            }
            
        except Exception as e:
            logger.error(f"Chat response error: {e}")
            return {
                'success': False,
                'response': "Îmi pare rău, am întâmpinat o problemă tehnică. Te rog să încerci din nou în câteva secunde.",
                'intent': 'error',
                'search_results': {'restaurants': [], 'events': []},
                'metadata': {
                    'response_time': time.time() - start_time,
                    'timestamp': datetime.now().isoformat(),
                    'error': str(e)
                }
            }
    
    def get_suggestions(self) -> List[Dict[str, Any]]:
        """Get contextual suggestions for user"""
        suggestions = [
            {"id": 1, "text": "Ce restaurante bune sunt în centru?", "category": "restaurant", "icon": "🍽️"},
            {"id": 2, "text": "Arată-mi evenimente din weekend", "category": "events", "icon": "🎉"},
            {"id": 3, "text": "Vreau pizza bună și ieftină", "category": "food", "icon": "🍕"},
            {"id": 4, "text": "Ce concerte sunt în oraș?", "category": "events", "icon": "🎵"},
            {"id": 5, "text": "Restaurant românesc traditional", "category": "restaurant", "icon": "🏠"},
            {"id": 6, "text": "Unde pot să mănânc sushi?", "category": "food", "icon": "🍣"},
        ]
        
        # Add data-driven suggestions
        if len(self.restaurants) > 0:
            popular_categories = {}
            for restaurant in self.restaurants:
                category = restaurant.get('category', '').lower()
                if category:
                    popular_categories[category] = popular_categories.get(category, 0) + 1
            
            if popular_categories:
                top_category = max(popular_categories, key=popular_categories.get)
                suggestions.append({
                    "id": 7, 
                    "text": f"Recomandă-mi un restaurant {top_category}", 
                    "category": "restaurant", 
                    "icon": "⭐"
                })
        
        return suggestions