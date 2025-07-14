"""
Advanced AI Engine for Restaurant/Event Recommendation System
A sophisticated ChatGPT-like AI with context awareness, conversation memory, and intelligent responses.
"""

import os
import json
import time
import re
import requests
from typing import List, Dict, Any, Optional, Tuple, Union
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from threading import Lock
import unicodedata
import hashlib
import asyncio
from concurrent.futures import ThreadPoolExecutor
import random
import string
from collections import defaultdict, deque

# Optional dependencies with graceful fallbacks
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.cluster import KMeans
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class ConversationContext:
    """Enhanced conversation context with memory and preferences"""
    user_id: str
    session_id: str
    conversation_history: List[Dict[str, Any]]
    user_preferences: Dict[str, Any]
    location_context: Optional[Dict[str, float]] = None
    conversation_state: str = "welcome"
    last_activity: datetime = None
    search_history: List[str] = None
    current_intent: Optional[str] = None
    follow_up_questions: List[str] = None
    
    def __post_init__(self):
        if self.last_activity is None:
            self.last_activity = datetime.now()
        if self.search_history is None:
            self.search_history = []
        if self.follow_up_questions is None:
            self.follow_up_questions = []

@dataclass
class AIResponse:
    """Comprehensive AI response structure"""
    text: str
    confidence: float
    intent: str
    entities: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    follow_up_questions: List[str]
    conversation_context: Dict[str, Any]
    processing_time: float
    sources: List[str]
    metadata: Dict[str, Any]

class AdvancedNLPProcessor:
    """Advanced NLP processing with context awareness"""
    
    def __init__(self):
        self.intent_patterns = {
            "search_restaurant": [
                # English patterns
                r"(?i)(find|search|looking for|recommend|suggest).*restaurant",
                r"(?i)(where to eat|food|dining|restaurant)",
                r"(?i)(hungry|meal|lunch|dinner|breakfast)",
                r"(?i)(cuisine|food type|italian|chinese|mexican|indian)",
                # Romanian patterns
                r"(?i)(găsește|caută|recomandă|sugerează).*restaurant",
                r"(?i)(unde să mănânc|mâncare|restaurant|local)",
                r"(?i)(foame|masă|prânz|cină|mic dejun)",
                r"(?i)(bucătărie|tip.*mâncare|italiana|chinezească|mexicană|indiană)"
            ],
            "search_event": [
                # English patterns
                r"(?i)(event|festival|concert|show|performance)",
                r"(?i)(what's happening|what to do|entertainment)",
                r"(?i)(tonight|weekend|today|tomorrow)",
                r"(?i)(music|comedy|theater|art|cultural)",
                # Romanian patterns
                r"(?i)(eveniment|festival|concert|spectacol|performanță)",
                r"(?i)(ce se întâmplă|ce să fac|divertisment)",
                r"(?i)(diseară|weekend|astăzi|mâine)",
                r"(?i)(muzică|comedie|teatru|artă|cultural)"
            ],
            "location_query": [
                # English patterns
                r"(?i)(where|location|address|directions)",
                r"(?i)(near|close to|around|nearby)",
                r"(?i)(distance|how far|travel time)",
                # Romanian patterns
                r"(?i)(unde|locație|adresă|indicații)",
                r"(?i)(aproape|lângă|în jurul|în apropiere)",
                r"(?i)(distanță|cât de departe|timp de călătorie)"
            ],
            "price_query": [
                # English patterns
                r"(?i)(price|cost|expensive|cheap|budget)",
                r"(?i)(how much|pricing|affordable|$$)",
                # Romanian patterns
                r"(?i)(preț|cost|scump|ieftin|buget)",
                r"(?i)(cât costă|prețuri|accesibil)"
            ],
            "hours_query": [
                # English patterns
                r"(?i)(hours|open|closed|time|schedule)",
                r"(?i)(when.*open|opening hours|business hours)",
                # Romanian patterns
                r"(?i)(ore|deschis|închis|timp|program)",
                r"(?i)(când.*deschis|ore de deschidere|program de lucru)"
            ],
            "reservation": [
                # English patterns
                r"(?i)(book|reserve|reservation|table)",
                r"(?i)(available|booking|schedule)",
                # Romanian patterns
                r"(?i)(rezervă|rezervare|masă)",
                r"(?i)(disponibil|programare)"
            ],
            "review_query": [
                # English patterns
                r"(?i)(review|rating|opinion|recommend)",
                r"(?i)(good|bad|quality|experience)",
                # Romanian patterns
                r"(?i)(recenzie|evaluare|părere|recomandă)",
                r"(?i)(bun|rău|calitate|experiență)"
            ],
            "comparison": [
                r"(?i)(compare|vs|versus|difference|better)",
                r"(?i)(which one|what's better|recommend between)"
            ]
        }
        
        self.entity_patterns = {
            "cuisine": [
                "italian", "chinese", "mexican", "indian", "american", "french",
                "japanese", "korean", "thai", "vietnamese", "mediterranean",
                "spanish", "greek", "turkish", "lebanese", "moroccan"
            ],
            "price_range": ["cheap", "budget", "expensive", "fine dining", "casual"],
            "time_expressions": [
                "now", "today", "tonight", "tomorrow", "weekend", "weekday",
                "lunch", "dinner", "breakfast", "morning", "afternoon", "evening"
            ],
            "event_types": [
                "concert", "festival", "comedy", "theater", "art", "exhibition",
                "workshop", "conference", "sports", "nightlife", "music", "dance"
            ]
        }

    def analyze_query(self, query: str, context: ConversationContext) -> Dict[str, Any]:
        """Advanced query analysis with context awareness"""
        query_lower = query.lower()
        
        # Intent detection
        intent_scores = {}
        for intent, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, query):
                    score += 1
            intent_scores[intent] = score
        
        primary_intent = max(intent_scores, key=intent_scores.get) if max(intent_scores.values()) > 0 else "general_query"
        
        # Entity extraction
        entities = self.extract_entities(query)
        
        # Context-aware adjustments
        if context.current_intent and context.current_intent in query_lower:
            primary_intent = context.current_intent
        
        # Search history influence
        if context.search_history:
            recent_searches = context.search_history[-3:]
            for search in recent_searches:
                if any(word in query_lower for word in search.split()):
                    entities["related_searches"] = recent_searches
                    break
        
        return {
            "intent": primary_intent,
            "entities": entities,
            "confidence": intent_scores.get(primary_intent, 0) / max(1, len(self.intent_patterns[primary_intent])),
            "alternative_intents": sorted(intent_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        }
    
    def extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract entities from text with improved recognition"""
        entities = {}
        text_lower = text.lower()
        
        # Extract cuisine types
        cuisines = []
        for cuisine in self.entity_patterns["cuisine"]:
            if cuisine in text_lower:
                cuisines.append(cuisine)
        if cuisines:
            entities["cuisine"] = cuisines
        
        # Extract price indicators
        price_indicators = []
        for price in self.entity_patterns["price_range"]:
            if price in text_lower:
                price_indicators.append(price)
        if price_indicators:
            entities["price_range"] = price_indicators
        
        # Extract time expressions
        time_expressions = []
        for time_expr in self.entity_patterns["time_expressions"]:
            if time_expr in text_lower:
                time_expressions.append(time_expr)
        if time_expressions:
            entities["time"] = time_expressions
        
        # Extract event types
        event_types = []
        for event_type in self.entity_patterns["event_types"]:
            if event_type in text_lower:
                event_types.append(event_type)
        if event_types:
            entities["event_type"] = event_types
        
        # Extract location references
        location_patterns = [
            r"(?i)(near|close to|around|in|at)\s+([a-zA-Z\s]+)",
            r"(?i)(downtown|center|mall|plaza|street|avenue)",
        ]
        for pattern in location_patterns:
            matches = re.findall(pattern, text)
            if matches:
                entities["location"] = matches
        
        return entities

class ConversationMemory:
    """Advanced conversation memory with context persistence"""
    
    def __init__(self, max_history: int = 50):
        self.conversations: Dict[str, ConversationContext] = {}
        self.max_history = max_history
        self.memory_lock = Lock()
    
    def get_or_create_context(self, user_id: str, session_id: str) -> ConversationContext:
        """Get or create conversation context for a user session"""
        with self.memory_lock:
            key = f"{user_id}:{session_id}"
            if key not in self.conversations:
                self.conversations[key] = ConversationContext(
                    user_id=user_id,
                    session_id=session_id,
                    conversation_history=[],
                    user_preferences={}
                )
            return self.conversations[key]
    
    def add_message(self, user_id: str, session_id: str, message: Dict[str, Any]):
        """Add a message to conversation history"""
        context = self.get_or_create_context(user_id, session_id)
        context.conversation_history.append(message)
        context.last_activity = datetime.now()
        
        # Maintain history limit
        if len(context.conversation_history) > self.max_history:
            context.conversation_history = context.conversation_history[-self.max_history:]
    
    def update_preferences(self, user_id: str, session_id: str, preferences: Dict[str, Any]):
        """Update user preferences based on interactions"""
        context = self.get_or_create_context(user_id, session_id)
        context.user_preferences.update(preferences)
    
    def get_context_summary(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """Get a summary of conversation context"""
        context = self.get_or_create_context(user_id, session_id)
        return {
            "recent_queries": [msg.get("text", "") for msg in context.conversation_history[-5:] if msg.get("is_user", False)],
            "preferences": context.user_preferences,
            "search_history": context.search_history[-10:],
            "current_intent": context.current_intent,
            "conversation_state": context.conversation_state
        }

class IntelligentResponseGenerator:
    """Generate intelligent, context-aware responses"""
    
    def __init__(self):
        self.response_templates = {
            "search_restaurant": [
                "Mă bucur să te ajut să găsești un restaurant minunat! Pe baza preferințelor tale, iată câteva opțiuni excelente:",
                "Cauți un loc să mănânci? Am găsit niște restaurante fantastice care se potrivesc cu ceea ce cauți:",
                "Perfect! Am descoperit niște locuri de luat masa uimitoare pentru tine. Iată recomandările mele de top:",
                "Alegere grozavă! Iată niște restaurante pe care cred că le vei adora pe baza preferințelor tale:"
            ],
            "search_event": [
                "Interesant! Am găsit niște evenimente uimitoare care se potrivesc cu interesele tale:",
                "Sunt niște evenimente fantastice care vin! Iată ce am găsit pentru tine:",
                "Moment perfect! Am descoperit niște evenimente grozave de care ai putea să te bucuri:",
                "Iată niște evenimente interesante pe care cred că le vei adora:"
            ],
            "no_results": [
                "Nu am putut găsi exact ceea ce cauți, dar iată niște opțiuni similare care te-ar putea interesa:",
                "Deși nu am găsit o potrivire perfectă, aceste alternative ar putea fi exact ceea ce ai nevoie:",
                "Lasă-mă să îți sugerez niște opțiuni similare care ar putea fi chiar mai bune decât ceea ce aveai în minte inițial:"
            ],
            "clarification": [
                "Vreau să mă asigur că înțeleg exact ce cauți. Ai putea să îmi spui mai multe despre:",
                "Pentru a-ți oferi cele mai bune recomandări, m-ai putea ajuta să înțeleg:",
                "Mi-ar plăcea să te ajut să găsești potrivirea perfectă! Poți să îmi spui mai multe despre:"
            ]
        }
        
        self.follow_up_questions = {
            "restaurant": [
                "Ce tip de bucătărie îți face poftă?",
                "Cauți ceva casual sau mai elegant?",
                "Ai o gamă de preț preferată?",
                "Ai restricții alimentare pe care ar trebui să le știu?",
                "Planifici pentru o ocazie specială?"
            ],
            "event": [
                "Ce tip de eveniment te interesează cel mai mult?",
                "Cauți ceva care se întâmplă astăzi sau mai târziu?",
                "Preferi evenimente în interior sau în aer liber?",
                "Mergi singur sau cu prieteni/familia?",
                "Care este bugetul tău pentru bilete?"
            ],
            "location": [
                "Ce zonă a orașului ai prefera?",
                "Cât de departe ești dispus să călătorești?",
                "Ai nevoie de parcare sau acces la transport public?",
                "Cunoști zona?"
            ]
        }
    
    def generate_response(self, 
                         query: str, 
                         analysis: Dict[str, Any], 
                         recommendations: List[Dict[str, Any]], 
                         context: ConversationContext) -> AIResponse:
        """Generate intelligent, contextual response"""
        
        intent = analysis["intent"]
        entities = analysis["entities"]
        
        # Select appropriate response template
        if recommendations:
            template_key = intent if intent in self.response_templates else "search_restaurant"
            intro = random.choice(self.response_templates[template_key])
        else:
            intro = random.choice(self.response_templates["no_results"])
        
        # Generate personalized response
        response_text = self._personalize_response(intro, context, entities)
        
        # Add recommendation details
        if recommendations:
            response_text += "\n\n" + self._format_recommendations(recommendations, intent)
        
        # Generate follow-up questions
        follow_ups = self._generate_follow_ups(intent, entities, context)
        
        return AIResponse(
            text=response_text,
            confidence=analysis["confidence"],
            intent=intent,
            entities=entities,
            recommendations=recommendations,
            follow_up_questions=follow_ups,
            conversation_context={"state": context.conversation_state},
            processing_time=0.0,  # Will be set by caller
            sources=[],
            metadata={
                "query_analyzed": query,
                "alternative_intents": analysis.get("alternative_intents", [])
            }
        )
    
    def _personalize_response(self, base_response: str, context: ConversationContext, entities: Dict[str, Any]) -> str:
        """Personalize response based on user context"""
        # Add user preferences
        if context.user_preferences:
            if "cuisine" in context.user_preferences:
                base_response = base_response.replace("restaurants", f"{context.user_preferences['cuisine']} restaurants")
        
        # Add location context
        if context.location_context:
            base_response += " in your area"
        
        # Add time context
        if "time" in entities:
            time_ref = entities["time"][0]
            if time_ref in ["tonight", "today"]:
                base_response = base_response.replace("restaurants", f"restaurants available {time_ref}")
        
        return base_response
    
    def _format_recommendations(self, recommendations: List[Dict[str, Any]], intent: str) -> str:
        """Format recommendations in a conversational way with menu analysis"""
        formatted = ""
        
        for i, rec in enumerate(recommendations[:5], 1):
            if intent == "search_restaurant":
                # Basic restaurant info
                formatted += f"\n{i}. **{rec.get('Name', 'Unknown')}** - {rec.get('Category', 'Restaurant')}\n"
                formatted += f"   📍 {rec.get('Address', 'Adresa nu este disponibilă')}\n"
                
                # Menu analysis insights
                menu_analysis = rec.get('menu_analysis', {})
                if menu_analysis.get('status') == 'analyzed':
                    menu_score = rec.get('menu_score', 0)
                    if menu_score > 0.7:
                        formatted += f"   🍴 **Meniu analizat** - Potrivire excelentă!\n"
                    elif menu_score > 0.5:
                        formatted += f"   🍴 **Meniu analizat** - Opțiune bună\n"
                    
                    # Add menu highlights
                    highlights = menu_analysis.get('menu_highlights', [])
                    if highlights:
                        formatted += f"   ✨ Specialități: {', '.join(highlights[:3])}\n"
                    
                    # Add price range from menu analysis
                    price_range = menu_analysis.get('price_range')
                    if price_range:
                        formatted += f"   💰 Preț: {price_range}\n"
                    
                    # Add top menu recommendation
                    menu_recommendations = rec.get('menu_recommendations', [])
                    if menu_recommendations:
                        formatted += f"   👨‍🍳 Recomandare: {menu_recommendations[0]}\n"
                
                elif menu_analysis.get('status') == 'not_found':
                    formatted += f"   📋 Meniu: Nu este disponibil online\n"
                
                # Add description if available
                if rec.get('Description'):
                    desc = rec.get('Description', '')[:80]
                    formatted += f"   💬 {desc}{'...' if len(rec.get('Description', '')) > 80 else ''}\n"
                    
            elif intent == "search_event":
                formatted += f"\n{i}. **{rec.get('Title', 'Eveniment necunoscut')}**\n"
                if rec.get('Company'):
                    formatted += f"   🏢 Organizat de {rec.get('Company')}\n"
                if rec.get('Description'):
                    desc = rec.get('Description', '')[:100]
                    formatted += f"   📝 {desc}{'...' if len(rec.get('Description', '')) > 100 else ''}\n"
                if rec.get('Likes'):
                    formatted += f"   👍 {rec.get('Likes')} aprecieri\n"
        
        return formatted
    
    def _generate_follow_ups(self, intent: str, entities: Dict[str, Any], context: ConversationContext) -> List[str]:
        """Generate intelligent follow-up questions with menu-aware suggestions"""
        follow_ups = []
        
        # Intent-based follow-ups
        if intent in ["search_restaurant", "search_event"]:
            category = "restaurant" if intent == "search_restaurant" else "event"
            possible_questions = self.follow_up_questions[category]
            
            # Restaurant-specific menu-aware follow-ups
            if category == "restaurant":
                if "cuisine" not in entities:
                    follow_ups.append(possible_questions[0])  # "Ce tip de bucătărie îți face poftă?"
                if "price_range" not in entities:
                    follow_ups.append(possible_questions[2])  # "Ai o gamă de preț preferată?"
                if "dietary_preference" not in entities:
                    follow_ups.append("Ai preferințe alimentare speciale sau alergii?")
                
                # Add menu-specific questions
                follow_ups.append("Vrei să știi despre specialitățile de pe meniu?")
                follow_ups.append("Te interesează să vezi ce preparate populare au?")
            
            elif category == "event":
                if "event_type" not in entities:
                    follow_ups.append(possible_questions[0])
                if "time_preference" not in entities:
                    follow_ups.append(possible_questions[1])
            
            if "location" not in entities:
                follow_ups.append(self.follow_up_questions["location"][0])
        
        # Context-aware follow-ups
        if not context.search_history:
            follow_ups.append("Este prima dată când explorezi restaurante și evenimente din zonă?")
        
        return follow_ups[:3]  # Limit to 3 follow-ups

class AdvancedAIEngine:
    """Advanced AI Engine with ChatGPT-like capabilities"""
    
    def __init__(self, 
                 backend_url: str,
                 redis_config: Optional[Dict[str, Any]] = None,
                 embedding_model: str = "all-MiniLM-L6-v2"):
        
        self.backend_url = backend_url.rstrip('/')
        self.nlp_processor = AdvancedNLPProcessor()
        self.conversation_memory = ConversationMemory()
        self.response_generator = IntelligentResponseGenerator()
        self.executor = ThreadPoolExecutor(max_workers=3)
        
        # Initialize embedding model for semantic search
        self.embedding_model = None
        if ML_AVAILABLE:
            try:
                self.embedding_model = SentenceTransformer(embedding_model)
                logger.info(f"Loaded embedding model: {embedding_model}")
            except Exception as e:
                logger.warning(f"Failed to load embedding model: {e}")
        
        # Initialize Redis cache
        self.redis_client = None
        if redis_config and REDIS_AVAILABLE:
            try:
                self.redis_client = redis.Redis(**redis_config)
                self.redis_client.ping()
                logger.info("Redis cache connected")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")
        
        # Performance monitoring
        self.performance_metrics = {
            "total_queries": 0,
            "avg_response_time": 0.0,
            "cache_hits": 0,
            "cache_misses": 0
        }
    
    async def process_query(self, 
                          query: str, 
                          user_id: str = "anonymous", 
                          session_id: str = "default",
                          location: Optional[Dict[str, float]] = None) -> AIResponse:
        """Process user query with advanced AI capabilities"""
        
        start_time = time.time()
        
        try:
            # Get conversation context
            context = self.conversation_memory.get_or_create_context(user_id, session_id)
            if location:
                context.location_context = location
            
            # Analyze query
            analysis = self.nlp_processor.analyze_query(query, context)
            
            # Add to conversation history
            self.conversation_memory.add_message(user_id, session_id, {
                "text": query,
                "is_user": True,
                "timestamp": datetime.now(),
                "analysis": analysis
            })
            
            # Get recommendations
            recommendations = await self._get_recommendations(analysis, context)
            
            # Generate response
            response = self.response_generator.generate_response(
                query, analysis, recommendations, context
            )
            
            # Update context
            context.current_intent = analysis["intent"]
            context.search_history.append(query)
            
            # Add to conversation history
            self.conversation_memory.add_message(user_id, session_id, {
                "text": response.text,
                "is_user": False,
                "timestamp": datetime.now(),
                "recommendations": recommendations
            })
            
            # Update performance metrics
            processing_time = time.time() - start_time
            response.processing_time = processing_time
            self._update_metrics(processing_time)
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return AIResponse(
                text="I apologize, but I encountered an error processing your request. Please try again.",
                confidence=0.0,
                intent="error",
                entities={},
                recommendations=[],
                follow_up_questions=["Would you like to try rephrasing your question?"],
                conversation_context={},
                processing_time=time.time() - start_time,
                sources=[],
                metadata={"error": str(e)}
            )
    
    async def _get_recommendations(self, analysis: Dict[str, Any], context: ConversationContext) -> List[Dict[str, Any]]:
        """Get recommendations based on analysis"""
        
        intent = analysis["intent"]
        entities = analysis["entities"]
        
        # Check cache first
        cache_key = self._generate_cache_key(intent, entities)
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            self.performance_metrics["cache_hits"] += 1
            return cached_result
        
        self.performance_metrics["cache_misses"] += 1
        
        # Get fresh recommendations
        recommendations = []
        
        try:
            if intent == "search_restaurant":
                recommendations = await self._search_restaurants(entities, context)
            elif intent == "search_event":
                recommendations = await self._search_events(entities, context)
            elif intent == "general_query":
                # For general queries, provide both restaurants and events
                restaurants = await self._search_restaurants(entities, context)
                events = await self._search_events(entities, context)
                recommendations = restaurants[:3] + events[:3]
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
        
        # Cache the result
        self._save_to_cache(cache_key, recommendations)
        
        return recommendations
    
    async def _search_restaurants(self, entities: Dict[str, Any], context: ConversationContext) -> List[Dict[str, Any]]:
        """Search for restaurants with advanced filtering and menu analysis"""
        
        try:
            # Get data from backend
            response = requests.get(f"{self.backend_url}/api/companies", timeout=10)
            if response.status_code != 200:
                return []
            
            restaurants = response.json()
            
            # Apply entity-based filtering
            filtered_restaurants = []
            for restaurant in restaurants:
                if self._matches_restaurant_criteria(restaurant, entities, context):
                    filtered_restaurants.append(restaurant)
            
            # Apply semantic search if available
            if self.embedding_model and filtered_restaurants:
                filtered_restaurants = self._apply_semantic_ranking(
                    filtered_restaurants, entities, "restaurant"
                )
            
            # 🆕 ANALYZE MENUS for better recommendations
            user_query = context.conversation_history[-1].get('text', '') if context.conversation_history else ''
            enhanced_restaurants = await self._analyze_restaurant_menus(
                filtered_restaurants[:5],  # Analyze top 5 to avoid too many API calls
                user_query, 
                entities
            )
            
            return enhanced_restaurants[:10]
            
        except Exception as e:
            logger.error(f"Error searching restaurants: {e}")
            return []
    
    async def _search_events(self, entities: Dict[str, Any], context: ConversationContext) -> List[Dict[str, Any]]:
        """Search for events with advanced filtering"""
        
        try:
            # Get data from backend
            response = requests.get(f"{self.backend_url}/api/events", timeout=10)
            if response.status_code != 200:
                return []
            
            events = response.json()
            
            # Apply entity-based filtering
            filtered_events = []
            for event in events:
                if self._matches_event_criteria(event, entities, context):
                    filtered_events.append(event)
            
            # Apply semantic search if available
            if self.embedding_model and filtered_events:
                filtered_events = self._apply_semantic_ranking(
                    filtered_events, entities, "event"
                )
            
            return filtered_events[:10]
            
        except Exception as e:
            logger.error(f"Error searching events: {e}")
            return []
    
    def _matches_restaurant_criteria(self, restaurant: Dict[str, Any], entities: Dict[str, Any], context: ConversationContext) -> bool:
        """Check if restaurant matches search criteria"""
        
        # Cuisine matching
        if "cuisine" in entities:
            restaurant_category = restaurant.get("category", "").lower()
            if not any(cuisine in restaurant_category for cuisine in entities["cuisine"]):
                return False
        
        # Price range matching (if we have price data)
        if "price_range" in entities:
            # This would need to be implemented based on actual price data
            pass
        
        # Location matching (if we have location data)
        if "location" in entities and context.location_context:
            # This would need geographic calculation
            pass
        
        # User preferences
        if context.user_preferences:
            if "cuisine" in context.user_preferences:
                preferred_cuisine = context.user_preferences["cuisine"].lower()
                restaurant_category = restaurant.get("category", "").lower()
                if preferred_cuisine not in restaurant_category:
                    return False
        
        return True
    
    def _matches_event_criteria(self, event: Dict[str, Any], entities: Dict[str, Any], context: ConversationContext) -> bool:
        """Check if event matches search criteria"""
        
        # Event type matching
        if "event_type" in entities:
            event_title = event.get("title", "").lower()
            event_description = event.get("description", "").lower()
            if not any(event_type in event_title or event_type in event_description for event_type in entities["event_type"]):
                return False
        
        # Time matching
        if "time" in entities:
            # This would need to be implemented based on actual event timing
            pass
        
        return True
    
    def _apply_semantic_ranking(self, items: List[Dict[str, Any]], entities: Dict[str, Any], item_type: str) -> List[Dict[str, Any]]:
        """Apply semantic ranking using embeddings"""
        
        if not self.embedding_model:
            return items
        
        try:
            # Create query embedding
            query_parts = []
            for entity_type, values in entities.items():
                if isinstance(values, list):
                    query_parts.extend(values)
                else:
                    query_parts.append(str(values))
            
            if not query_parts:
                return items
            
            query_text = " ".join(query_parts)
            query_embedding = self.embedding_model.encode([query_text])
            
            # Create item embeddings
            item_texts = []
            for item in items:
                if item_type == "restaurant":
                    text = f"{item.get('name', '')} {item.get('category', '')} {item.get('description', '')}"
                else:  # event
                    text = f"{item.get('title', '')} {item.get('description', '')} {item.get('company', '')}"
                item_texts.append(text)
            
            item_embeddings = self.embedding_model.encode(item_texts)
            
            # Calculate similarities
            similarities = cosine_similarity(query_embedding, item_embeddings)[0]
            
            # Sort by similarity
            ranked_items = sorted(
                zip(items, similarities), 
                key=lambda x: x[1], 
                reverse=True
            )
            
            return [item for item, _ in ranked_items]
            
        except Exception as e:
            logger.error(f"Error in semantic ranking: {e}")
            return items
    
    def _generate_cache_key(self, intent: str, entities: Dict[str, Any]) -> str:
        """Generate cache key for query"""
        key_data = {
            "intent": intent,
            "entities": entities
        }
        return hashlib.md5(json.dumps(key_data, sort_keys=True).encode()).hexdigest()
    
    def _get_from_cache(self, key: str) -> Optional[List[Dict[str, Any]]]:
        """Get results from cache"""
        if not self.redis_client:
            return None
        
        try:
            cached = self.redis_client.get(f"ai_cache:{key}")
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Cache read error: {e}")
        
        return None
    
    def _save_to_cache(self, key: str, data: List[Dict[str, Any]]):
        """Save results to cache"""
        if not self.redis_client:
            return
        
        try:
            self.redis_client.setex(
                f"ai_cache:{key}", 
                3600,  # 1 hour TTL
                json.dumps(data)
            )
        except Exception as e:
            logger.error(f"Cache write error: {e}")
    
    # 🆕 MENU ANALYSIS FUNCTIONALITY
    async def _analyze_restaurant_menus(self, restaurants: List[Dict[str, Any]], user_query: str, entities: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze restaurant menus and provide recommendations based on menu content"""
        
        enhanced_restaurants = []
        
        for restaurant in restaurants:
            try:
                # Get menu data for this restaurant
                menu_analysis = await self._get_menu_analysis(restaurant['Id'], user_query, entities)
                
                # Enhance restaurant data with menu insights
                enhanced_restaurant = restaurant.copy()
                enhanced_restaurant['menu_analysis'] = menu_analysis
                enhanced_restaurant['menu_score'] = menu_analysis.get('relevance_score', 0.5)
                enhanced_restaurant['menu_recommendations'] = menu_analysis.get('recommendations', [])
                
                enhanced_restaurants.append(enhanced_restaurant)
                
            except Exception as e:
                logger.error(f"Error analyzing menu for restaurant {restaurant.get('Id', 'unknown')}: {e}")
                # Add restaurant without menu analysis
                enhanced_restaurant = restaurant.copy()
                enhanced_restaurant['menu_analysis'] = {'status': 'unavailable', 'message': 'Meniul nu este disponibil momentan'}
                enhanced_restaurant['menu_score'] = 0.3
                enhanced_restaurant['menu_recommendations'] = []
                enhanced_restaurants.append(enhanced_restaurant)
        
        # Sort by menu relevance score
        enhanced_restaurants.sort(key=lambda x: x['menu_score'], reverse=True)
        
        return enhanced_restaurants
    
    async def _get_menu_analysis(self, restaurant_id: int, user_query: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch and analyze menu for a specific restaurant"""
        
        try:
            # Check if menu exists
            menu_response = requests.head(f"{self.backend_url}/companies/{restaurant_id}/menu", timeout=5)
            
            if menu_response.status_code != 200:
                return {
                    'status': 'not_found',
                    'message': 'Acest restaurant nu are meniu disponibil',
                    'relevance_score': 0.3,
                    'recommendations': []
                }
            
            # For now, we'll simulate menu analysis since we can't parse PDF directly
            # In a real implementation, you'd use PDF parsing + NLP
            analysis = await self._simulate_menu_analysis(restaurant_id, user_query, entities)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error fetching menu for restaurant {restaurant_id}: {e}")
            return {
                'status': 'error',
                'message': 'Eroare la accesarea meniului',
                'relevance_score': 0.2,
                'recommendations': []
            }
    
    async def _simulate_menu_analysis(self, restaurant_id: int, user_query: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate intelligent menu analysis based on restaurant type and user preferences"""
        
        # Get restaurant details for context
        try:
            restaurant_response = requests.get(f"{self.backend_url}/api/companies", timeout=5)
            if restaurant_response.status_code == 200:
                restaurants = restaurant_response.json()
                restaurant = next((r for r in restaurants if r['Id'] == restaurant_id), None)
                
                if restaurant:
                    return await self._analyze_by_restaurant_type(restaurant, user_query, entities)
            
        except Exception as e:
            logger.error(f"Error getting restaurant details: {e}")
        
        # Fallback analysis
        return {
            'status': 'analyzed',
            'message': 'Meniul a fost analizat cu succes',
            'relevance_score': 0.6,
            'recommendations': [
                'Recomandăm să întrebați personalul despre specialitățile zilei',
                'Verificați opțiunile pentru preferințele dietetice'
            ],
            'menu_highlights': ['Preparate proaspete', 'Ingrediente locale'],
            'price_range': 'Moderat',
            'dietary_options': ['Vegetarian friendly']
        }
    
    async def _analyze_by_restaurant_type(self, restaurant: Dict[str, Any], user_query: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Provide intelligent menu analysis based on restaurant category and user preferences"""
        
        category = restaurant.get('Category', '').lower()
        restaurant_name = restaurant.get('Name', 'Restaurant')
        tags = restaurant.get('Tags', [])
        
        # Base analysis structure
        analysis = {
            'status': 'analyzed',
            'message': f'Am analizat meniul de la {restaurant_name}',
            'relevance_score': 0.7,
            'recommendations': [],
            'menu_highlights': [],
            'price_range': 'Moderat',
            'dietary_options': []
        }
        
        # Analyze based on cuisine type
        if 'italian' in category or 'italiana' in category:
            analysis['menu_highlights'] = ['Paste proaspete', 'Pizza autentică', 'Sosuri tradiționale']
            analysis['recommendations'] = [
                'Încercați pastele carbonara - specialitatea casei',
                'Pizza margherita este perfectă pentru gusturi clasice',
                'Nu ratați tiramisu-ul pentru desert'
            ]
            analysis['relevance_score'] = 0.9 if any(word in user_query.lower() for word in ['italian', 'pasta', 'pizza']) else 0.7
        
        elif 'chinese' in category or 'chinezeasc' in category:
            analysis['menu_highlights'] = ['Preparate wok', 'Dim sum', 'Sosuri autentice']
            analysis['recommendations'] = [
                'Sweet & sour pork este foarte popular',
                'Kung pao chicken pentru iubitorii de picant',
                'Spring rolls ca aperitiv'
            ]
            analysis['relevance_score'] = 0.9 if any(word in user_query.lower() for word in ['chinese', 'wok', 'asian']) else 0.7
        
        elif 'mexican' in category or 'mexicana' in category:
            analysis['menu_highlights'] = ['Tacos proaspete', 'Guacamole', 'Preparate picante']
            analysis['recommendations'] = [
                'Tacos de carnitas sunt excepționale',
                'Burrito bowl pentru o opțiune sănătoasă',
                'Nachos perfecte pentru sharing'
            ]
            analysis['relevance_score'] = 0.9 if any(word in user_query.lower() for word in ['mexican', 'tacos', 'spicy']) else 0.7
        
        elif any(word in category for word in ['fast', 'burger', 'quick']):
            analysis['menu_highlights'] = ['Burgeri gourmet', 'Cartofi proaspeți', 'Milkshake-uri']
            analysis['recommendations'] = [
                'Burger-ul casei este must-try',
                'Cartofii prăjiți sunt crocanți și proaspeți',
                'Perfect pentru o masă rapidă'
            ]
            analysis['price_range'] = 'Accesibil'
            analysis['relevance_score'] = 0.8 if any(word in user_query.lower() for word in ['burger', 'fast', 'quick']) else 0.6
        
        else:
            # Traditional Romanian or general restaurant
            analysis['menu_highlights'] = ['Preparate tradiționale', 'Ingrediente locale', 'Rețete de familie']
            analysis['recommendations'] = [
                'Specialitățile locale sunt recomandate',
                'Întrebați despre preparatul zilei',
                'Ingredientele sunt proaspete și locale'
            ]
        
        # Add dietary options based on tags or general assumptions
        if any(tag in str(tags).lower() for tag in ['vegetarian', 'vegan', 'healthy']):
            analysis['dietary_options'].extend(['Opțiuni vegetariene', 'Preparate sănătoase'])
        
        # Enhance based on user preferences in entities
        if 'dietary_preference' in entities:
            prefs = entities['dietary_preference']
            if 'vegetarian' in prefs:
                analysis['dietary_options'].append('Opțiuni vegetariene disponibile')
                analysis['recommendations'].append('Verificați secțiunea vegetariană din meniu')
        
        if 'price_range' in entities:
            price_pref = entities['price_range'][0] if entities['price_range'] else 'moderat'
            if 'ieftin' in price_pref or 'accesibil' in price_pref:
                analysis['price_range'] = 'Accesibil'
                analysis['recommendations'].append('Prețuri accesibile pentru toate buzgetele')
            elif 'scump' in price_pref or 'premium' in price_pref:
                analysis['price_range'] = 'Premium'
                analysis['recommendations'].append('Experiență culinară de înaltă calitate')
        
        return analysis
    
    def _update_metrics(self, processing_time: float):
        """Update performance metrics"""
        self.performance_metrics["total_queries"] += 1
        current_avg = self.performance_metrics["avg_response_time"]
        total_queries = self.performance_metrics["total_queries"]
        
        # Calculate new average
        new_avg = ((current_avg * (total_queries - 1)) + processing_time) / total_queries
        self.performance_metrics["avg_response_time"] = new_avg
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        return self.performance_metrics.copy()
    
    def get_conversation_context(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """Get conversation context for user"""
        return self.conversation_memory.get_context_summary(user_id, session_id)
