from ai_recommender import AIRecommender
import os

if __name__ == "__main__":
    # Use environment variable or default to localhost
    dotnet_url = os.getenv("DOTNET_API_URL", "http://localhost:5298")
    bot = AIRecommender(dotnet_url)
    
    while True:
        query = input("\nÎntrebare: ")
        if query.lower() in ["exit", "iesire"]:
            break
        print("Răspuns:", bot.generate_response(query))