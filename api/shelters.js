// Serverless handler for /api/shelters
const { db, isConfigured, configError, verifyAdmin } = require('./_db');

// Helper: Haversine distance formula to calculate distance in KM between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in KM
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isConfigured) {
    return res.status(500).json({ error: "Database setup incomplete on backend.", detail: configError });
  }

  try {
    if (req.method === 'GET') {
      const { lat, lng } = req.query;
      const snapshot = await db.collection('shelters').get();
      let shelters = [];

      snapshot.forEach(doc => {
        shelters.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // If user's latitude and longitude are supplied, compute distance and sort by proximity
      if (lat && lng) {
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);

        shelters = shelters.map(shelter => {
          let distance = null;
          if (shelter.latitude && shelter.longitude) {
            distance = calculateDistance(userLat, userLng, parseFloat(shelter.latitude), parseFloat(shelter.longitude));
          }
          return { ...shelter, distance };
        });

        // Sort shelters: those with distances first, ascending
        shelters.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }

      return res.status(200).json(shelters);

    } else if (req.method === 'POST') {
      // Create new shelter (Admin only)
      try {
        await verifyAdmin(req);
      } catch (authErr) {
        return res.status(403).json({ error: authErr.message });
      }

      const { name, address, latitude, longitude, capacity, occupancy, foodAvailable, medicalAvailable } = req.body;
      if (!name || !address || capacity === undefined) {
        return res.status(400).json({ error: "Missing required shelter parameters (name, address, capacity)." });
      }

      const newShelter = {
        name,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        capacity: parseInt(capacity),
        occupancy: occupancy ? parseInt(occupancy) : 0,
        foodAvailable: foodAvailable === true || foodAvailable === "yes",
        medicalAvailable: medicalAvailable === true || medicalAvailable === "yes",
        createdAt: new Date()
      };

      const docRef = await db.collection('shelters').add(newShelter);
      return res.status(201).json({ message: "Shelter created successfully.", id: docRef.id });

    } else if (req.method === 'PUT') {
      // Edit shelter (Admin only)
      try {
        await verifyAdmin(req);
      } catch (authErr) {
        return res.status(403).json({ error: authErr.message });
      }

      const { id, name, address, latitude, longitude, capacity, occupancy, foodAvailable, medicalAvailable } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Missing shelter ID for updates." });
      }

      const updateFields = {};
      if (name) updateFields.name = name;
      if (address) updateFields.address = address;
      if (latitude !== undefined) updateFields.latitude = parseFloat(latitude);
      if (longitude !== undefined) updateFields.longitude = parseFloat(longitude);
      if (capacity !== undefined) updateFields.capacity = parseInt(capacity);
      if (occupancy !== undefined) updateFields.occupancy = parseInt(occupancy);
      if (foodAvailable !== undefined) updateFields.foodAvailable = (foodAvailable === true || foodAvailable === "yes");
      if (medicalAvailable !== undefined) updateFields.medicalAvailable = (medicalAvailable === true || medicalAvailable === "yes");

      await db.collection('shelters').doc(id).update(updateFields);
      return res.status(200).json({ message: "Shelter updated successfully.", id });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error("Shelters API Error:", error);
    return res.status(500).json({ error: "Server error in shelters endpoint", details: error.message });
  }
};
