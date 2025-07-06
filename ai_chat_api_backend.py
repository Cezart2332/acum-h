from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from datetime import datetime
import traceback
from ai_recommender_backend import EnhancedAIRecommenderBackend
import json
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5298')

REDIS_CONFIG = {
    'host': os.getenv('REDIS_HOST', 'localhost'),
    'port': int(os.getenv('REDIS_PORT', 6379)),
    'db': int(os.getenv('REDIS_DB', 0))
}

# Global AI recommender instance
ai_recommender = None

def initialize_ai_recommender():
    """Initialize the AI recommender with C# backend"""
    global ai_recommender
    
    try:
        # Try to initialize with Redis
        ai_recommender = EnhancedAIRecommenderBackend(
            backend_url=BACKEND_URL,
            redis_config=REDIS_CONFIG,
            openai_api_key=os.getenv('OPENAI_API_KEY'),
            embedding_model="all-MiniLM-L6-v2",
            cache_ttl=3600
        )
        logger.info("AI Recommender initialized successfully with Redis and C# backend")
        
    except Exception as e:
        logger.warning(f"Failed to initialize with Redis: {e}")
        try:
            # Fallback without Redis
            ai_recommender = EnhancedAIRecommenderBackend(
                backend_url=BACKEND_URL,
                redis_config=None,
                openai_api_key=os.getenv('OPENAI_API_KEY'),
                embedding_model="all-MiniLM-L6-v2",
                cache_ttl=3600
            )
            logger.info("AI Recommender initialized successfully without Redis but with C# backend")
            
        except Exception as e2:
            logger.error(f"Failed to initialize AI Recommender: {e2}")
            raise

def create_error_response(message: str, status_code: int = 500, error_type: str = "ServerError") -> tuple:
    """Create standardized error response"""
    return jsonify({
        'error': True,
        'message': message,
        'type': error_type,
        'timestamp': datetime.now().isoformat()
    }), status_code

def validate_request_data(data: Dict[str, Any], required_fields: list) -> tuple:
    """Validate request data and return error response if invalid"""
    if not data:
        return create_error_response("No data provided", 400, "ValidationError")
    
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return create_error_response(
            f"Missing required fields: {', '.join(missing_fields)}", 
            400, 
            "ValidationError"
        )
    
    return None, None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        if ai_recommender:
            health_status = ai_recommender.get_health_status()
            return jsonify({
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'ai_system': health_status,
                'backend_url': BACKEND_URL
            })
        else:
            return jsonify({
                'status': 'unhealthy',
                'message': 'AI recommender not initialized',
                'timestamp': datetime.now().isoformat()
            }), 503
            
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return create_error_response("Health check failed", 503, "SystemError")

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint"""
    try:
        data = request.get_json()
        
        # Validate request
        validation_error, status_code = validate_request_data(data, ['query'])
        if validation_error:
            return validation_error, status_code
        
        query = data.get('query', '').strip()
        user_id = data.get('user_id')
        
        # Validate query
        if not query:
            return create_error_response("Query cannot be empty", 400, "ValidationError")
        
        if len(query) > 1000:
            return create_error_response("Query too long (max 1000 characters)", 400, "ValidationError")
        
        # Check if AI recommender is available
        if not ai_recommender:
            return create_error_response("AI system not available", 503, "SystemError")
        
        # Get AI response
        response_data = ai_recommender.get_chat_response(query, user_id)
        
        # Add success flag
        response_data['success'] = True
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        logger.error(traceback.format_exc())
        return create_error_response("Internal server error", 500, "ServerError")

@app.route('/chat/suggestions', methods=['GET'])
def chat_suggestions():
    """Get chat suggestions for user"""
    try:
        suggestions = [
            {
                'id': 1,
                'text': 'Salut! Cum te cheamă?',
                'category': 'greeting',
                'icon': '👋'
            },
            {
                'id': 2,
                'text': 'Recomanzi-mi un restaurant italian',
                'category': 'restaurant',
                'icon': '🍝'
            },
            {
                'id': 3,
                'text': 'Vreau să mănânc pizza',
                'category': 'food',
                'icon': '🍕'
            },
            {
                'id': 4,
                'text': 'Ce evenimente sunt în weekend?',
                'category': 'events',
                'icon': '🎉'
            },
            {
                'id': 5,
                'text': 'Unde găsesc mâncare românească?',
                'category': 'food',
                'icon': '🥘'
            },
            {
                'id': 6,
                'text': 'Ce restaurante sunt aproape de mine?',
                'category': 'restaurant',
                'icon': '📍'
            },
            {
                'id': 7,
                'text': 'Arată-mi meniul pentru restaurantul X',
                'category': 'menu',
                'icon': '📋'
            },
            {
                'id': 8,
                'text': 'Ce companii sunt în zona mea?',
                'category': 'location',
                'icon': '🏢'
            }
        ]
        
        return jsonify({
            'success': True,
            'suggestions': suggestions,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Suggestions endpoint error: {e}")
        return create_error_response("Failed to get suggestions", 500, "ServerError")

@app.route('/chat/history', methods=['GET'])
def chat_history():
    """Get chat history for user (placeholder for future implementation)"""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return create_error_response("User ID required", 400, "ValidationError")
        
        # For now, return empty history
        # In a real implementation, this would fetch from database
        return jsonify({
            'success': True,
            'history': [],
            'user_id': user_id,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"History endpoint error: {e}")
        return create_error_response("Failed to get history", 500, "ServerError")

@app.route('/chat/feedback', methods=['POST'])
def chat_feedback():
    """Submit feedback for chat responses"""
    try:
        data = request.get_json()
        
        # Validate request
        validation_error, status_code = validate_request_data(data, ['rating', 'message_id'])
        if validation_error:
            return validation_error, status_code
        
        rating = data.get('rating')
        message_id = data.get('message_id')
        feedback_text = data.get('feedback', '')
        user_id = data.get('user_id')
        
        # Validate rating
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return create_error_response("Rating must be between 1 and 5", 400, "ValidationError")
        
        # Log feedback (in production, save to database)
        logger.info(f"Feedback received - Rating: {rating}, Message ID: {message_id}, User: {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Feedback submitted successfully',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Feedback endpoint error: {e}")
        return create_error_response("Failed to submit feedback", 500, "ServerError")

@app.route('/companies/details/<int:company_id>', methods=['GET'])
def company_details(company_id):
    """Get detailed company information from backend"""
    try:
        if not ai_recommender:
            return create_error_response("AI system not available", 503, "SystemError")
        
        # Find company in cache
        company = next(
            (r for r in ai_recommender.data_cache['restaurants'] if r.id == company_id),
            None
        )
        
        if not company:
            return create_error_response("Company not found", 404, "NotFound")
        
        # Get events for this company
        company_events = ai_recommender.get_company_events(company_id)
        
        return jsonify({
            'success': True,
            'company': {
                'id': company.id,
                'name': company.name,
                'category': company.category,
                'address': company.address,
                'description': company.description,
                'rating': company.rating,
                'contact': company.contact,
                'image': company.image,
                'tags': company.tags,
                'latitude': company.latitude,
                'longitude': company.longitude,
                'cui': company.cui,
                'events': [
                    {
                        'id': event.id,
                        'title': event.title,
                        'description': event.description,
                        'photo': event.photo,
                        'tags': event.tags,
                        'likes': event.likes
                    }
                    for event in company_events
                ]
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Company details error: {e}")
        return create_error_response("Failed to get company details", 500, "ServerError")

@app.route('/companies/<int:company_id>/menu', methods=['GET'])
def company_menu(company_id):
    """Get company menu PDF"""
    try:
        if not ai_recommender:
            return create_error_response("AI system not available", 503, "SystemError")
        
        menu_data = ai_recommender.get_company_menu(company_id)
        
        if not menu_data:
            return create_error_response("Menu not found", 404, "NotFound")
        
        from flask import Response
        return Response(
            menu_data,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'inline; filename=menu_{company_id}.pdf'
            }
        )
        
    except Exception as e:
        logger.error(f"Company menu error: {e}")
        return create_error_response("Failed to get menu", 500, "ServerError")

@app.route('/events/details/<int:event_id>', methods=['GET'])
def event_details(event_id):
    """Get detailed event information"""
    try:
        if not ai_recommender:
            return create_error_response("AI system not available", 503, "SystemError")
        
        # Find event in cache
        event = next(
            (e for e in ai_recommender.data_cache['events'] if e.id == event_id),
            None
        )
        
        if not event:
            return create_error_response("Event not found", 404, "NotFound")
        
        return jsonify({
            'success': True,
            'event': {
                'id': event.id,
                'title': event.title,
                'description': event.description,
                'photo': event.photo,
                'tags': event.tags,
                'likes': event.likes,
                'company': event.company,
                'company_id': event.company_id
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Event details error: {e}")
        return create_error_response("Failed to get event details", 500, "ServerError")

@app.route('/search', methods=['POST'])
def search():
    """Direct search endpoint"""
    try:
        data = request.get_json()
        
        # Validate request
        validation_error, status_code = validate_request_data(data, ['query'])
        if validation_error:
            return validation_error, status_code
        
        query = data.get('query', '').strip()
        search_type = data.get('type', 'all')  # 'all', 'restaurants', 'events'
        limit = min(data.get('limit', 10), 50)  # Max 50 results
        
        if not query:
            return create_error_response("Query cannot be empty", 400, "ValidationError")
        
        if not ai_recommender:
            return create_error_response("AI system not available", 503, "SystemError")
        
        # Perform search
        if search_type == 'all':
            results = ai_recommender.search_all(query)
        elif search_type == 'restaurants':
            results = {
                'restaurants': ai_recommender.semantic_search(query, 'restaurants', limit) + 
                             ai_recommender.keyword_search(query, 'restaurants', limit),
                'events': []
            }
        elif search_type == 'events':
            results = {
                'restaurants': [],
                'events': ai_recommender.semantic_search(query, 'events', limit) + 
                         ai_recommender.keyword_search(query, 'events', limit)
            }
        else:
            return create_error_response("Invalid search type", 400, "ValidationError")
        
        # Format results
        formatted_results = {
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
                for result in results.get('restaurants', [])
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
                for result in results.get('events', [])
            ]
        }
        
        return jsonify({
            'success': True,
            'query': query,
            'search_type': search_type,
            'results': formatted_results,
            'total_results': len(formatted_results['restaurants']) + len(formatted_results['events']),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Search endpoint error: {e}")
        return create_error_response("Search failed", 500, "ServerError")

@app.route('/admin/refresh', methods=['POST'])
def admin_refresh():
    """Admin endpoint to refresh AI data from backend"""
    try:
        # In production, add authentication here
        auth_token = request.headers.get('Authorization')
        if not auth_token or auth_token != f"Bearer {os.getenv('ADMIN_TOKEN', 'admin123')}":
            return create_error_response("Unauthorized", 401, "AuthError")
        
        if not ai_recommender:
            return create_error_response("AI system not available", 503, "SystemError")
        
        # Refresh data from backend
        ai_recommender.refresh_data()
        
        return jsonify({
            'success': True,
            'message': 'Data refreshed successfully from C# backend',
            'timestamp': datetime.now().isoformat(),
            'backend_url': BACKEND_URL
        })
        
    except Exception as e:
        logger.error(f"Admin refresh error: {e}")
        return create_error_response("Failed to refresh data", 500, "ServerError")

@app.route('/admin/status', methods=['GET'])
def admin_status():
    """Admin endpoint to get system status"""
    try:
        # In production, add authentication here
        auth_token = request.headers.get('Authorization')
        if not auth_token or auth_token != f"Bearer {os.getenv('ADMIN_TOKEN', 'admin123')}":
            return create_error_response("Unauthorized", 401, "AuthError")
        
        if not ai_recommender:
            return create_error_response("AI system not available", 503, "SystemError")
        
        health_status = ai_recommender.get_health_status()
        
        return jsonify({
            'success': True,
            'system_status': health_status,
            'backend_url': BACKEND_URL,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Admin status error: {e}")
        return create_error_response("Failed to get status", 500, "ServerError")

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return create_error_response("Endpoint not found", 404, "NotFound")

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return create_error_response("Method not allowed", 405, "MethodNotAllowed")

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}")
    return create_error_response("Internal server error", 500, "ServerError")

if __name__ == '__main__':
    try:
        # Initialize AI recommender
        initialize_ai_recommender()
        
        # Start Flask app
        port = int(os.getenv('PORT', 5001))  # Different port to avoid conflicts
        debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
        
        logger.info(f"Starting AI Chat API (Backend version) on port {port}")
        logger.info(f"Using C# backend at: {BACKEND_URL}")
        app.run(host='0.0.0.0', port=port, debug=debug)
        
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        exit(1)