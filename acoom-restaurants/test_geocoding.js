// Test geocoding API with "strada constantin hurmuzache"
const testGeocoding = async () => {
  try {
    const API_KEY = "d5466dbfa4a84344b872af4009106e17";
    const address = "strada constantin hurmuzache";
    const encoded = encodeURI(`${address}, Constanta, Romania`);
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encoded}&limit=1&lang=ro&filter=countrycode:ro&apiKey=${API_KEY}`;

    console.log("Testing geocoding for:", address);
    console.log("Full query:", `${address}, Constanta, Romania`);
    console.log("API URL:", url);
    console.log("---");

    const response = await fetch(url);
    const data = await response.json();

    console.log("Raw API Response:");
    console.log(JSON.stringify(data, null, 2));
    console.log("---");

    if (data.features && data.features.length > 0) {
      const location = data.features[0];
      const { lat, lon } = location.properties;
      const formatted = location.properties.formatted || "No formatted address";

      console.log("✅ GEOCODING SUCCESS:");
      console.log("Latitude:", lat);
      console.log("Longitude:", lon);
      console.log("Formatted Address:", formatted);
      console.log(
        "Full Properties:",
        JSON.stringify(location.properties, null, 2)
      );
    } else {
      console.log("❌ GEOCODING FAILED:");
      console.log("No features found in response");
      console.log("Query:", `${address}, Constanta, Romania`);
    }
  } catch (error) {
    console.error("❌ ERROR:", error);
  }
};

// Run the test
testGeocoding();
