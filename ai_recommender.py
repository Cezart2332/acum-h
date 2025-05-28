import requests

class AIRecommender:
    def __init__(self, dotnet_api_url, ollama_host="http://localhost:11434", llm_model="mistral"):
        self.api_url = dotnet_api_url.rstrip("/")
        self.ollama_host = ollama_host
        self.llm_model = llm_model

    def fetch_companies(self, filters: dict = None):
        """Încarcă toate companiile din backend cu filtre optionale"""
        try:
            r = requests.get(f"{self.api_url}/companies", params=filters, timeout=5)
            return r.json()
        except Exception as e:
            print(f"Eroare API: {str(e)}")
            return []

    def generate_response(self, query: str):
        """Folosește LLM-ul să analizeze direct datele brute"""
        # 1. Încarcă datele relevante din backend
        all_data = self.fetch_companies()
        
        

        # 2. Construiește promptul
        context = "\n".join([
            f"Restaurant: {c['name']} | Categorie: {c['category']} | Adresa: {c['address']} | Descriere: {c['description']} | taguri: {', '.join(c['tags'])}"
            for c in all_data
        ])
        
        prompt = f"""
        Ești un asistent pentru recomandări de restaurante. Folosește lista de restaurante să răspunzi.
        Daca te intreaba cu ce te ocupi poti sa ii raspunzi ca esti asistenul aplicatiei AcoomH si te ocupi cu recomandarea de restaurante
        Incearca sa fii creativ la intrebari, nu da raspunsuri scurte si la obiect, ci incearca sa fii cat mai natural si sa dai raspunsuri cat mai lungi si mai detaliate.
        Raspunde doar cu ce date ai, nu inventa date despre restaurante care nu exista in lista.
        Dacă nu găsești informații relevante, răspunde că nu ai suficiente date pentru a răspunde la întrebare.
        Daca intrebarile nu sunt despre restaurante incearca sa le explici ca scopul tau este doar de a recomanda restaurante și nu poți răspunde la alte întrebări
        Daca iti multumeste cineva pentru ajutor, poti sa ii raspunzi ca te bucuri ca ai putut fi de ajutor si sa ii urezi o zi buna
        Nu răspunde la întrebări despre alte subiecte decât restaurante, nu da informații despre alte subiecte.
        Dar asta nu inseamna ca nu poti sa raspunde la multumiri sau la intrebari despre tine ca asistent, poti sa raspunzi ca esti asistentul aplicatiei AcoomH si te ocupi cu recomandarea de restaurante
        .
        
        Lista restaurante:
        {context}
        
        Întrebare utilizator: {query}
        Răspuns natural în română:"""
        
        # 3. Generează răspunsul
        try:
            response = requests.post(
                f"{self.ollama_host}/api/generate",
                json={
                    "model": self.llm_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.5}
                }
            )
            return response.json()["response"]
        except Exception as e:
            return f"Eroare generare: {str(e)}"