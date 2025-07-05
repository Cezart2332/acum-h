from ai_recommender import AIRecommender

if __name__ == "__main__":
    dotnet_url = "http://172.20.10.2:5298"
    bot = AIRecommender(dotnet_url)
    
    while True:
        query = input("\nÎntrebare: ")
        if query.lower() in ["exit", "iesire"]:
            break
        print("Răspuns:", bot.generate_response(query))