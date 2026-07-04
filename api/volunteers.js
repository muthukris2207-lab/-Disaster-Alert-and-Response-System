// Serverless handler for /api/volunteers
const { db, isConfigured, configError, verifyUser, verifyAdmin } = require('./_db');

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
      // Get all volunteers (Admin only)
      try {
        await verifyAdmin(req);
      } catch (authErr) {
        return res.status(403).json({ error: authErr.message });
      }

      const snapshot = await db.collection('volunteers').orderBy('createdAt', 'desc').get();
      const volunteers = [];
      snapshot.forEach(doc => {
        volunteers.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return res.status(200).json(volunteers);

    } else if (req.method === 'POST') {
      // Register new volunteer (authenticated user)
      let decodedToken;
      try {
        decodedToken = await verifyUser(req);
      } catch (authErr) {
        return res.status(401).json({ error: authErr.message });
      }

      const { name, email, phone, skills, availableArea } = req.body;
      if (!name || !email || !phone || !skills || !availableArea) {
        return res.status(400).json({ error: "Missing required volunteer parameters (name, email, phone, skills, availableArea)." });
      }

      const newVolunteer = {
        name,
        email,
        phone,
        skills, // e.g. "First Aid, Search and Rescue"
        availableArea, // e.g. "Downtown / North Zone"
        userId: decodedToken.uid,
        assignedTask: '', // Initially empty
        createdAt: new Date()
      };

      const docRef = await db.collection('volunteers').add(newVolunteer);
      return res.status(201).json({ message: "Volunteer registered successfully.", id: docRef.id });

    } else if (req.method === 'PUT') {
      // Assign tasks to a volunteer (Admin only)
      try {
        await verifyAdmin(req);
      } catch (authErr) {
        return res.status(403).json({ error: authErr.message });
      }

      const { id, assignedTask } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Missing volunteer ID." });
      }

      await db.collection('volunteers').doc(id).update({
        assignedTask: assignedTask || '',
        updatedAt: new Date()
      });

      return res.status(200).json({ message: "Volunteer task assigned successfully.", id });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error("Volunteers API Error:", error);
    return res.status(500).json({ error: "Server error in volunteers endpoint", details: error.message });
  }
};
