"""
Advanced AI Chat API - ChatGPT-like interface for Restaurant/Event recommendations
Provides streaming responses, context awareness, and intelligent conversation management
"""

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import os
import json
import asyncio
import time
import logging
from datetime import datetime
from typing import Dict, Any, Generator
import uuid
from ai_advanced_engine import AdvancedAIEngine, AIResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins="*")  # Configure CORS for your specific domains in production

# Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5298')  # Default to localhost
AI_PORT = int(os.getenv('AI_PORT', 5001))
AI_HOST = os.getenv('AI_HOST', '0.0.0.0')

# Redis configuration (optional)
REDIS_CONFIG = None
try:
    REDIS_CONFIG = {
        'host': os.getenv('REDIS_HOST', 'localhost'),
        'port': int(os.getenv('REDIS_PORT', 6379)),
        'db': int(os.getenv('REDIS_DB', 0))
    }
except:
    pass

# Global AI engine instance
ai_engine: AdvancedAIEngine = None

def initialize_ai_engine():
    """Initialize the advanced AI engine"""
    global ai_engine
    
    try:
        ai_engine = AdvancedAIEngine(
            backend_url=BACKEND_URL,
            redis_config=REDIS_CONFIG,
            embedding_model="all-MiniLM-L6-v2"
        )
        logger.info("Advanced AI Engine initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize AI Engine: {e}")
        # Create a simple fallback AI engine
        ai_engine = SimpleAIFallback()
        logger.warning("Using simple fallback AI engine")
        return False

class SimpleAIFallback:
    """Simple fallback AI when advanced engine fails"""
    
    def __init__(self):
        self.responses = {
            "restaurant": [
                "Te pot ajuta să găsești restaurante! Încearcă să cauți bucătării specifice precum 'Italiana' sau 'Chinezească'.",
                "Cauți un loc să mănânci? Îți recomand să verifici restaurantele locale din zona ta.",
                "Pentru recomandări de restaurante, încearcă să fii mai specific despre tipul de bucătărie sau locație."
            ],
            "event": [
                "Te pot ajuta să descoperi evenimente! Încearcă să cauți 'concerte', 'festivaluri' sau 'spectacole'.",
                "Cauți ceva de făcut? Verifică evenimentele locale care se întâmplă în zona ta.",
                "Pentru recomandări de evenimente, încearcă să fii mai specific despre tipul de eveniment care te interesează."
            ],
            "general": [
                "Salut! Sunt aici să te ajut să găsești restaurante grozave și evenimente interesante! Ce cauți?",
                "Te pot ajuta cu recomandări de restaurante și descoperirea de evenimente. Cum te pot ajuta?",
                "Întreabă-mă despre restaurante, evenimente sau ce se întâmplă în zona ta!"
            ]
        }
    
    async def process_query(self, query, user_id="anonymous", session_id="default", location=None):
        """Simple query processing"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['restaurant', 'food', 'eat', 'dining']):
            intent = "restaurant"
        elif any(word in query_lower for word in ['event', 'show', 'concert', 'festival']):
            intent = "event"
        else:
            intent = "general"
        
        import random
        response_text = random.choice(self.responses[intent])
        
        # Create mock response
        class MockResponse:
            def __init__(self, text, intent):
                self.text = text
                self.confidence = 0.7
                self.intent = intent
                self.entities = {}
                self.recommendations = []
                self.follow_up_questions = [
                    "Ce tip de bucătărie te interesează?",
                    "Cauți ceva în apropiere?",
                    "Care este bugetul tău?"
                ]
                self.conversation_context = {}
                self.processing_time = 0.1
                self.sources = []
                self.metadata = {"fallback": True}
        
        return MockResponse(response_text, intent)

def get_fallback_response(query: str, user_id: str = "anonymous"):
    """Get a fallback response when the main AI engine fails"""
    fallback_engine = SimpleAIFallback()
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        response = loop.run_until_complete(fallback_engine.process_query(
            query=query,
            user_id=user_id,
            session_id="fallback",
            location=None
        ))
        return response
    finally:
        loop.close()

def stream_response_simple(response_obj, session_id: str) -> Generator[str, None, None]:
    """Simple streaming for fallback responses"""
    try:
        # Send response in chunks
        words = response_obj.text.split()
        chunk_size = 3
        
        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i + chunk_size])
            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
            time.sleep(0.05)
        
        # Send follow-up questions
        if response_obj.follow_up_questions:
            yield f"data: {json.dumps({'type': 'follow_up', 'content': response_obj.follow_up_questions})}\n\n"
        
        # Send metadata
        yield f"data: {json.dumps({'type': 'metadata', 'content': {'confidence': response_obj.confidence, 'intent': response_obj.intent, 'session_id': session_id}})}\n\n"
        
        # End stream
        yield f"data: {json.dumps({'type': 'end'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    backend_status = "unknown"
    try:
        import requests
        response = requests.get(f"{BACKEND_URL}/companies", timeout=5)
        backend_status = "connected" if response.status_code == 200 else "error"
    except:
        backend_status = "disconnected"
    
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "engine_status": "initialized" if ai_engine else "not_initialized",
        "backend_url": BACKEND_URL,
        "backend_status": backend_status,
        "ai_type": "advanced" if hasattr(ai_engine, 'conversation_memory') else "fallback"
    })

@app.route('/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint to verify API is working"""
    return jsonify({
        "message": "AI API is working!",
        "timestamp": datetime.now().isoformat(),
        "backend_url": BACKEND_URL,
        "ai_engine_status": "initialized" if ai_engine else "not_initialized"
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Main chat endpoint with ChatGPT-like interface"""
    try:
        # Parse request
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        query = data.get('message', '').strip()
        if not query:
            return jsonify({"error": "Message is required"}), 400
        
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id', str(uuid.uuid4()))
        location = data.get('location')  # Optional: {"latitude": float, "longitude": float}
        stream = data.get('stream', False)  # Optional: enable streaming response
        
        # Validate AI engine
        if not ai_engine:
            logger.error("AI engine not initialized, using fallback")
            response_obj = get_fallback_response(query, user_id)
            return jsonify({
                "response": response_obj.text,
                "confidence": response_obj.confidence,
                "intent": response_obj.intent,
                "entities": response_obj.entities,
                "recommendations": response_obj.recommendations,
                "follow_up_questions": response_obj.follow_up_questions,
                "processing_time": response_obj.processing_time,
                "session_id": session_id,
                "metadata": response_obj.metadata
            })
        
        # Process query - simplified approach
        try:
            # Use threaded execution to avoid async conflicts
            import threading
            import time
            
            result_container = {'response': None, 'error': None}
            
            def run_query():
                try:
                    # Create new event loop in thread
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    # Run the query
                    response = loop.run_until_complete(ai_engine.process_query(
                        query=query,
                        user_id=user_id,
                        session_id=session_id,
                        location=location
                    ))
                    result_container['response'] = response
                    
                except Exception as e:
                    result_container['error'] = str(e)
                finally:
                    loop.close()
            
            # Start query in thread with timeout
            thread = threading.Thread(target=run_query)
            thread.start()
            thread.join(timeout=10)  # 10 second timeout
            
            if thread.is_alive():
                logger.error("Query timed out")
                response_obj = get_fallback_response(query, user_id)
            elif result_container['error']:
                logger.error(f"Query error: {result_container['error']}")
                response_obj = get_fallback_response(query, user_id)
            else:
                response_obj = result_container['response']
            
            if stream:
                return Response(
                    stream_with_context(stream_response_simple(response_obj, session_id)),
                    mimetype='text/plain',
                    headers={
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*'
                    }
                )
            else:
                return jsonify({
                    "response": response_obj.text,
                    "confidence": response_obj.confidence,
                    "intent": response_obj.intent,
                    "entities": response_obj.entities,
                    "recommendations": response_obj.recommendations,
                    "follow_up_questions": response_obj.follow_up_questions,
                    "processing_time": response_obj.processing_time,
                    "session_id": session_id,
                    "metadata": response_obj.metadata
                })
                
        except Exception as e:
            logger.error(f"Error in processing: {e}")
            # Fallback to simple response
            response_obj = get_fallback_response(query, user_id)
            return jsonify({
                "response": response_obj.text,
                "confidence": response_obj.confidence,
                "intent": response_obj.intent,
                "entities": response_obj.entities,
                "recommendations": response_obj.recommendations,
                "follow_up_questions": response_obj.follow_up_questions,
                "processing_time": response_obj.processing_time,
                "session_id": session_id,
                "metadata": response_obj.metadata
            })
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "I apologize, but I encountered an error. Please try again."
        }), 500

def stream_response(query: str, user_id: str, session_id: str, location: Dict[str, float] = None) -> Generator[str, None, None]:
    """Stream response chunks for real-time chat experience"""
    try:
        # Send initial status
        yield f"data: {json.dumps({'type': 'status', 'message': 'Processing your request...'})}\n\n"
        
        # Process query
        response = asyncio.run(ai_engine.process_query(
            query=query,
            user_id=user_id,
            session_id=session_id,
            location=location
        ))
        
        # Stream response in chunks for ChatGPT-like experience
        words = response.text.split()
        chunk_size = 3  # Words per chunk
        
        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i + chunk_size])
            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
            time.sleep(0.05)  # Small delay for natural streaming effect
        
        # Send recommendations if available
        if response.recommendations:
            yield f"data: {json.dumps({'type': 'recommendations', 'content': response.recommendations})}\n\n"
        
        # Send follow-up questions
        if response.follow_up_questions:
            yield f"data: {json.dumps({'type': 'follow_up', 'content': response.follow_up_questions})}\n\n"
        
        # Send final metadata
        yield f"data: {json.dumps({'type': 'metadata', 'content': {'confidence': response.confidence, 'intent': response.intent, 'processing_time': response.processing_time, 'session_id': session_id}})}\n\n"
        
        # End stream
        yield f"data: {json.dumps({'type': 'end'})}\n\n"
        
    except Exception as e:
        logger.error(f"Error in stream response: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': 'Sorry, I encountered an error processing your request.'})}\n\n"

@app.route('/api/conversation', methods=['GET'])
def get_conversation():
    """Get conversation history for a user session"""
    try:
        user_id = request.args.get('user_id', 'anonymous')
        session_id = request.args.get('session_id')
        
        if not session_id:
            return jsonify({"error": "session_id is required"}), 400
        
        if not ai_engine:
            return jsonify({"error": "AI engine not initialized"}), 500
        
        context = ai_engine.get_conversation_context(user_id, session_id)
        
        return jsonify({
            "user_id": user_id,
            "session_id": session_id,
            "context": context
        })
    
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/suggestions', methods=['POST'])
def get_suggestions():
    """Get smart suggestions based on partial input"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        partial_query = data.get('partial_query', '').strip()
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id', 'default')
        
        # Generate smart suggestions based on context and partial input
        suggestions = []
        
        if len(partial_query) >= 2:
            # Basic suggestions based on common patterns
            if 'rest' in partial_query.lower():
                suggestions.extend([
                    "restaurants near me",
                    "restaurants with outdoor seating",
                    "best restaurants for dinner",
                    "italian restaurants"
                ])
            elif 'event' in partial_query.lower():
                suggestions.extend([
                    "events this weekend",
                    "events tonight",
                    "music events",
                    "free events"
                ])
            elif any(word in partial_query.lower() for word in ['food', 'eat', 'hungry']):
                suggestions.extend([
                    "best places to eat",
                    "food delivery options",
                    "casual dining restaurants",
                    "fine dining experiences"
                ])
            else:
                # General suggestions
                suggestions.extend([
                    "find restaurants near me",
                    "what events are happening today",
                    "recommend a good restaurant",
                    "show me upcoming events"
                ])
        
        # Get context-aware suggestions if AI engine is available
        if ai_engine:
            try:
                context = ai_engine.get_conversation_context(user_id, session_id)
                
                # Add context-based suggestions
                if context.get('recent_queries'):
                    recent_intents = [q for q in context['recent_queries'][-3:]]
                    if any('restaurant' in q.lower() for q in recent_intents):
                        suggestions.extend([
                            "similar restaurants",
                            "restaurants with different cuisine",
                            "make a reservation"
                        ])
            except Exception as e:
                logger.warning(f"Error getting context suggestions: {e}")
        
        return jsonify({
            "suggestions": suggestions[:8],  # Limit to 8 suggestions
            "partial_query": partial_query
        })
    
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/feedback', methods=['POST'])
def feedback():
    """Handle user feedback on AI responses"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id')
        feedback_type = data.get('type')  # 'helpful', 'not_helpful', 'wrong'
        feedback_text = data.get('feedback')
        response_id = data.get('response_id')
        
        # Log feedback for improvement
        logger.info(f"User feedback - User: {user_id}, Session: {session_id}, Type: {feedback_type}, Response: {response_id}")
        
        # TODO: Implement feedback processing for model improvement
        # This could include:
        # - Updating user preferences
        # - Adjusting recommendation weights
        # - Training data collection
        
        return jsonify({
            "status": "feedback_recorded",
            "message": "Thank you for your feedback!"
        })
    
    except Exception as e:
        logger.error(f"Error processing feedback: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/reset', methods=['POST'])
def reset_conversation():
    """Reset conversation context for a user session"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({"error": "session_id is required"}), 400
        
        if ai_engine:
            # Clear conversation context
            context_key = f"{user_id}:{session_id}"
            if context_key in ai_engine.conversation_memory.conversations:
                del ai_engine.conversation_memory.conversations[context_key]
        
        return jsonify({
            "status": "conversation_reset",
            "message": "Conversation context has been reset"
        })
    
    except Exception as e:
        logger.error(f"Error resetting conversation: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Get AI engine performance metrics"""
    try:
        if not ai_engine:
            return jsonify({"error": "AI engine not initialized"}), 500
        
        metrics = ai_engine.get_performance_metrics()
        
        return jsonify({
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_error(error):        return jsonify({"error": "Internal server error"}), 500

# Backward compatibility endpoints
@app.route('/chat', methods=['POST'])
def chat_compatibility():
    """Backward compatibility endpoint - redirects to /api/chat"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Convert old format to new format
        if 'query' in data and 'message' not in data:
            data['message'] = data['query']
        
        # Extract required fields
        query = data.get('message', '').strip()
        if not query:
            return jsonify({"error": "Message is required"}), 400
        
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id', str(uuid.uuid4()))
        location = data.get('location')
        
        # Process using the same logic as the main chat endpoint
        if not ai_engine:
            logger.error("AI engine not initialized, using fallback")
            response_obj = get_fallback_response(query, user_id)
        else:
            try:
                # Use threaded execution to avoid async conflicts
                import threading
                import time
                
                result_container = {'response': None, 'error': None}
                
                def run_query():
                    try:
                        # Create new event loop in thread
                        import asyncio
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        
                        # Run the query
                        response = loop.run_until_complete(ai_engine.process_query(
                            query=query,
                            user_id=user_id,
                            session_id=session_id,
                            location=location
                        ))
                        result_container['response'] = response
                        
                    except Exception as e:
                        result_container['error'] = str(e)
                    finally:
                        loop.close()
                
                # Start query in thread with timeout
                thread = threading.Thread(target=run_query)
                thread.start()
                thread.join(timeout=10)  # 10 second timeout
                
                if thread.is_alive():
                    logger.error("Query timed out")
                    response_obj = get_fallback_response(query, user_id)
                elif result_container['error']:
                    logger.error(f"Query error: {result_container['error']}")
                    response_obj = get_fallback_response(query, user_id)
                else:
                    response_obj = result_container['response']
            
            except Exception as e:
                logger.error(f"Error in processing: {e}")
                response_obj = get_fallback_response(query, user_id)
        
        # Return response in the format expected by the old frontend
        return jsonify({
            "success": True,
            "response": response_obj.text,
            "confidence": response_obj.confidence,
            "intent": response_obj.intent,
            "entities": response_obj.entities,
            "recommendations": response_obj.recommendations,
            "follow_up_questions": response_obj.follow_up_questions,
            "processing_time": response_obj.processing_time,
            "session_id": session_id,
            "metadata": response_obj.metadata
        })
        
    except Exception as e:
        logger.error(f"Error in compatibility endpoint: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/chat/suggestions', methods=['GET', 'POST'])
def chat_suggestions_compatibility():
    """Backward compatibility for suggestions endpoint"""
    try:
        # Return default suggestions
        suggestions = [
            "Find restaurants near me",
            "What events are happening today?", 
            "Recommend a good Italian restaurant",
            "Show me upcoming concerts",
            "Find family-friendly activities",
            "Where can I find live music?"
        ]
        
        return jsonify({
            "success": True,
            "suggestions": suggestions
        })
    except Exception as e:
        logger.error(f"Error in suggestions compatibility: {e}")
        return jsonify({"success": False, "suggestions": []}), 500

def run_ai_server():
    """Run the AI server"""
    print("\n" + "="*60)
    print("🤖 ADVANCED AI CHAT ENGINE")
    print("="*60)
    print(f"🚀 Starting ChatGPT-like AI server...")
    print(f"🌐 Backend URL: {BACKEND_URL}")
    print(f"📡 AI Server: http://{AI_HOST}:{AI_PORT}")
    print(f"🧠 Features: Context Memory, Semantic Search, Streaming")
    print("="*60)
    
    # Initialize AI engine
    if not initialize_ai_engine():
        print("❌ Failed to initialize AI engine. Some features may not work.")
    else:
        print("✅ AI engine initialized successfully!")
    
    print(f"\n🎯 Endpoints:")
    print(f"   POST /api/chat - Main chat interface")
    print(f"   GET  /api/conversation - Get conversation history")
    print(f"   POST /api/suggestions - Get smart suggestions")
    print(f"   POST /api/feedback - Submit feedback")
    print(f"   POST /api/reset - Reset conversation")
    print(f"   GET  /api/metrics - Performance metrics")
    print(f"   GET  /health - Health check")
    
    print(f"\n🔥 Starting server on {AI_HOST}:{AI_PORT}")
    print("💡 Use Ctrl+C to stop the server\n")
    
    try:
        app.run(
            host=AI_HOST,
            port=AI_PORT,
            debug=False,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n👋 AI server stopped by user")
    except Exception as e:
        print(f"\n❌ Server error: {e}")

if __name__ == '__main__':
    run_ai_server()
