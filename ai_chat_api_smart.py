from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
import json
from ai_smart_chatbot import SmartChatbot

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
BACKEND_URL = "http://localhost:5298"

# Initialize smart chatbot
chatbot = None

def initialize_chatbot():
    global chatbot
    try:
        chatbot = SmartChatbot(BACKEND_URL)
        logger.info("Smart chatbot initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize chatbot: {e}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        global chatbot
        if chatbot is None:
            initialize_chatbot()
        
        # Test backend connectivity
        backend_status = "healthy"
        try:
            import requests
            response = requests.get(f"{BACKEND_URL}/companies", timeout=5)
            if response.status_code != 200:
                backend_status = "unhealthy"
        except:
            backend_status = "unhealthy"
        
        # Get data counts
        restaurants_count = len(chatbot.restaurants) if chatbot else 0
        events_count = len(chatbot.events) if chatbot else 0
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "smart_chatbot_v1.0",
            "ai_system": {
                "status": "healthy" if chatbot else "unhealthy",
                "backend_connection": backend_status,
                "chatbot_initialized": chatbot is not None,
                "data_cache": {
                    "restaurants_count": restaurants_count,
                    "events_count": events_count,
                    "last_updated": getattr(chatbot, 'last_refresh', datetime.now()).isoformat() if chatbot else None
                }
            },
            "backend_url": BACKEND_URL
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint for natural conversation"""
    try:
        global chatbot
        if chatbot is None:
            if not initialize_chatbot():
                return jsonify({
                    "success": False,
                    "error": "Chatbot initialization failed",
                    "response": "Îmi pare rău, sistemul de chat nu este disponibil momentan. Te rog să încerci mai târziu."
                }), 500
        
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({
                "success": False,
                "error": "Missing query parameter",
                "response": "Te rog să îmi spui ce cauți."
            }), 400
        
        query = data['query'].strip()
        if not query:
            return jsonify({
                "success": False,
                "error": "Empty query",
                "response": "Te rog să îmi pui o întrebare sau să îmi spui ce cauți."
            }), 400
        
        user_id = data.get('user_id', 'anonymous')
        
        # Get response from smart chatbot
        response = chatbot.get_chat_response(query, user_id)
        
        logger.info(f"Chat request: '{query}' -> Intent: {response.get('intent')} -> {len(response.get('response', ''))} chars")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "response": "Îmi pare rău, am întâmpinat o problemă tehnică. Te rog să încerci din nou.",
            "intent": "error",
            "search_results": {"restaurants": [], "events": []},
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
        }), 500

@app.route('/chat/suggestions', methods=['GET'])
def get_suggestions():
    """Get contextual suggestions for the user"""
    try:
        global chatbot
        if chatbot is None:
            if not initialize_chatbot():
                # Return default suggestions if chatbot fails
                default_suggestions = [
                    {"id": 1, "text": "Ce restaurante bune sunt în oraș?", "category": "restaurant", "icon": "🍽️"},
                    {"id": 2, "text": "Arată-mi evenimente din weekend", "category": "events", "icon": "🎉"},
                    {"id": 3, "text": "Vreau pizza bună", "category": "food", "icon": "🍕"},
                    {"id": 4, "text": "Ce concerte sunt?", "category": "events", "icon": "🎵"},
                ]
                return jsonify({
                    "success": True,
                    "suggestions": default_suggestions
                })
        
        suggestions = chatbot.get_suggestions()
        
        return jsonify({
            "success": True,
            "suggestions": suggestions,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Suggestions error: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "suggestions": []
        }), 500

@app.route('/refresh', methods=['POST'])
def refresh_data():
    """Manually refresh data from backend"""
    try:
        global chatbot
        if chatbot is None:
            if not initialize_chatbot():
                return jsonify({
                    "success": False,
                    "error": "Chatbot not available"
                }), 500
        
        chatbot.refresh_data()
        
        return jsonify({
            "success": True,
            "message": "Data refreshed successfully",
            "restaurants_count": len(chatbot.restaurants),
            "events_count": len(chatbot.events),
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Refresh error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/companies/<int:company_id>/menu', methods=['GET'])
def get_company_menu(company_id):
    """Get menu for a specific company (proxy to backend)"""
    try:
        import requests
        response = requests.get(f"{BACKEND_URL}/companies/{company_id}/menu", timeout=10)
        
        if response.status_code == 200:
            return response.content, 200, {'Content-Type': 'application/pdf'}
        else:
            return jsonify({
                "success": False,
                "error": "Menu not available"
            }), 404
            
    except Exception as e:
        logger.error(f"Menu error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/companies/details/<int:company_id>', methods=['GET'])
def get_company_details(company_id):
    """Get detailed information about a company"""
    try:
        global chatbot
        if chatbot is None:
            return jsonify({
                "success": False,
                "error": "Chatbot not available"
            }), 500
        
        # Find company in our data
        company = None
        for restaurant in chatbot.restaurants:
            if restaurant.get('id') == company_id:
                company = restaurant
                break
        
        if not company:
            return jsonify({
                "success": False,
                "error": "Company not found"
            }), 404
        
        return jsonify({
            "success": True,
            "company": company
        })
        
    except Exception as e:
        logger.error(f"Company details error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/events/details/<int:event_id>', methods=['GET'])
def get_event_details(event_id):
    """Get detailed information about an event"""
    try:
        global chatbot
        if chatbot is None:
            return jsonify({
                "success": False,
                "error": "Chatbot not available"
            }), 500
        
        # Find event in our data
        event = None
        for evt in chatbot.events:
            if evt.get('id') == event_id:
                event = evt
                break
        
        if not event:
            return jsonify({
                "success": False,
                "error": "Event not found"
            }), 404
        
        return jsonify({
            "success": True,
            "event": event
        })
        
    except Exception as e:
        logger.error(f"Event details error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Endpoint not found",
        "message": "The requested endpoint does not exist"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "Internal server error",
        "message": "An unexpected error occurred"
    }), 500

if __name__ == '__main__':
    logger.info("Starting Smart AI Chat API...")
    
    # Initialize chatbot on startup
    if initialize_chatbot():
        logger.info("✅ Smart chatbot ready!")
    else:
        logger.warning("⚠️ Chatbot initialization failed, will retry on first request")
    
    # Start Flask app
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=False,
        threaded=True
    )