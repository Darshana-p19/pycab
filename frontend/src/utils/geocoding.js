// Geocoding utility with fallback options and rate limiting
// const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// export class GeocodingService {
//   constructor() {
//     this.cache = new Map();
//     this.lastRequestTime = 0;
//     this.minRequestInterval = 1000; // 1 second between requests (respecting Nominatim's ToS)
//   }

//   async searchLocation(query, countryCode = 'in') {
//     if (!query || query.length < 2) {
//       return [];
//     }

//     // Check cache first
//     const cacheKey = `${query}-${countryCode}`;
//     const cached = this.cache.get(cacheKey);
//     if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
//       return cached.data;
//     }

//     // Rate limiting
//     const now = Date.now();
//     const timeSinceLastRequest = now - this.lastRequestTime;
//     if (timeSinceLastRequest < this.minRequestInterval) {
//       await new Promise(resolve => 
//         setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
//       );
//     }

//     try {
//       // Try OpenStreetMap first
//       const response = await fetch(
//         `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=${countryCode}&limit=5`,
//         {
//           headers: {
//             'User-Agent': 'RideBookingApp/1.0', // Required by Nominatim ToS
//             'Accept-Language': 'en',
//           }
//         }
//       );

//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}`);
//       }

//       const data = await response.json();
      
//       // Update cache
//       this.cache.set(cacheKey, {
//         timestamp: Date.now(),
//         data
//       });
      
//       this.lastRequestTime = Date.now();
//       return data;

//     } catch (error) {
//       console.warn('OpenStreetMap failed, trying fallback...', error);
      
//       // Fallback to Mapbox or other service
//       return await this.searchFallback(query);
//     }
//   }

//   async searchFallback(query) {
//     // Fallback 1: Use LocationIQ (free tier available)
//     try {
//       const response = await fetch(
//         `https://us1.locationiq.com/v1/search.php?key=pk.YOUR_API_KEY&q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`,
//         {
//           headers: {
//             'User-Agent': 'RideBookingApp/1.0',
//           }
//         }
//       );
      
//       if (response.ok) {
//         const data = await response.json();
//         return data.map(item => ({
//           display_name: item.display_name,
//           lat: item.lat,
//           lon: item.lon,
//           place_id: item.place_id
//         }));
//       }
//     } catch (error) {
//       console.warn('Fallback also failed:', error);
//     }

//     // Fallback 2: Use a simple local database for common places
//     return this.getLocalSuggestions(query);
//   }

//   getLocalSuggestions(query) {
//     // Add common places for your area
//     const commonPlaces = [
//       { display_name: "Rajkot Railway Station, Rajkot, Gujarat", lat: "22.2986", lon: "70.7989", place_id: "1" },
//       { display_name: "Marwadi University, Rajkot, Gujarat", lat: "22.3398", lon: "70.8556", place_id: "2" },
//       { display_name: "Nyari Dam, Rajkot, Gujarat", lat: "22.4098", lon: "70.7656", place_id: "3" },
//     ];

//     const lowerQuery = query.toLowerCase();
//     return commonPlaces.filter(place => 
//       place.display_name.toLowerCase().includes(lowerQuery)
//     );
//   }
// }

// // Create singleton instance
// export const geocodingService = new GeocodingService();

// Geocoding utility for location search
export class GeocodingService {
  constructor() {
    this.cache = new Map();
  }

  async searchLocations(query) {
    if (!query || query.length < 2) {
      return [];
    }

    // Check cache first
    if (this.cache.has(query)) {
      return this.cache.get(query);
    }

    try {
      // Try multiple geocoding services with fallbacks
      const results = await Promise.race([
        this.searchOpenStreetMap(query),
        this.searchLocationIQ(query),
        new Promise(resolve => setTimeout(() => resolve([]), 2000))
      ]);

      // Cache the results
      this.cache.set(query, results);
      
      return results;
    } catch (error) {
      console.warn('Geocoding error:', error);
      return this.getLocalSuggestions(query);
    }
  }

  async searchOpenStreetMap(query) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`,
      {
        headers: {
          'User-Agent': 'PyCabApp/1.0',
          'Accept-Language': 'en'
        }
      }
    );

    if (!response.ok) {
      throw new Error('OpenStreetMap failed');
    }

    const data = await response.json();
    return data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      place_id: item.place_id
    }));
  }

  async searchLocationIQ(query) {
    const response = await fetch(
      `https://us1.locationiq.com/v1/search.php?key=YOUR_LOCATIONIQ_KEY&q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`
    );

    if (!response.ok) {
      throw new Error('LocationIQ failed');
    }

    const data = await response.json();
    return data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      place_id: item.place_id
    }));
  }

  getLocalSuggestions(query) {
    // Return common places for your area
    const commonPlaces = [
      { display_name: "Rajkot Railway Station, Rajkot, Gujarat", lat: 22.2986, lon: 70.7989, place_id: "1" },
      { display_name: "Marwadi University, Rajkot, Gujarat", lat: 22.3398, lon: 70.8556, place_id: "2" },
      { display_name: "Nyari Dam, Rajkot, Gujarat", lat: 22.4098, lon: 70.7656, place_id: "3" },
      { display_name: "Lal Pari Lake, Rajkot, Gujarat", lat: 22.2894, lon: 70.8025, place_id: "4" },
      { display_name: "Kisanpara Chowk, Rajkot, Gujarat", lat: 22.2767, lon: 70.7906, place_id: "5" },
    ];

    const lowerQuery = query.toLowerCase();
    return commonPlaces.filter(place => 
      place.display_name.toLowerCase().includes(lowerQuery)
    );
  }
}

export const geocodingService = new GeocodingService();