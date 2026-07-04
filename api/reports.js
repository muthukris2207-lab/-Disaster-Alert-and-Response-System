// Serverless handler for /api/reports
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
      // Admin only: Get all incident reports and emergency requests
      try {
        await verifyAdmin(req);
      } catch (authErr) {
        return res.status(403).json({ error: authErr.message });
      }

      // Fetch Incident Reports
      const reportsSnapshot = await db.collection('reports').orderBy('createdAt', 'desc').get();
      const reports = [];
      reportsSnapshot.forEach(doc => {
        reports.push({ id: doc.id, type: 'report', ...doc.data() });
      });

      // Fetch Emergency Requests
      const emergencySnapshot = await db.collection('emergency_requests').orderBy('createdAt', 'desc').get();
      const emergencyRequests = [];
      emergencySnapshot.forEach(doc => {
        emergencyRequests.push({ id: doc.id, type: 'emergency_request', ...doc.data() });
      });

      return res.status(200).json({ reports, emergencyRequests });

    } else if (req.method === 'POST') {
      // User creates a report or emergency request
      let decodedToken;
      try {
        decodedToken = await verifyUser(req);
      } catch (authErr) {
        return res.status(401).json({ error: authErr.message });
      }

      const { isEmergencyRequest, ...payload } = req.body;

      if (isEmergencyRequest) {
        // Emergency Request
        const { name, phone, typeOfHelp, latitude, longitude } = payload;
        if (!name || !phone || !typeOfHelp) {
          return res.status(400).json({ error: "Missing required emergency fields (name, phone, typeOfHelp)." });
        }

        const newRequest = {
          name,
          phone,
          typeOfHelp,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          userId: decodedToken.uid,
          status: 'Pending',
          createdAt: new Date()
        };

        const docRef = await db.collection('emergency_requests').add(newRequest);
        return res.status(201).json({ message: "Emergency request submitted.", id: docRef.id });

      } else {
        // Standard Incident Report
        const { disasterType, description, photoUrl, latitude, longitude } = payload;
        if (!disasterType || !description) {
          return res.status(400).json({ error: "Missing required incident fields (disasterType, description)." });
        }

        const newReport = {
          disasterType,
          description,
          photoUrl: photoUrl || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          userId: decodedToken.uid,
          status: 'Pending',
          createdAt: new Date()
        };

        const docRef = await db.collection('reports').add(newReport);
        return res.status(201).json({ message: "Incident report submitted.", id: docRef.id });
      }

    } else if (req.method === 'PUT') {
      // Verify/Reject report or request (Admin only)
      try {
        await verifyAdmin(req);
      } catch (authErr) {
        return res.status(403).json({ error: authErr.message });
      }

      const { id, type, status } = req.body;
      if (!id || !type || !status) {
        return res.status(400).json({ error: "Missing required fields (id, type, status)." });
      }

      if (status !== 'Verified' && status !== 'Rejected' && status !== 'Pending') {
        return res.status(400).json({ error: "Invalid status value. Must be 'Verified', 'Rejected', or 'Pending'." });
      }

      const collectionName = type === 'emergency_request' ? 'emergency_requests' : 'reports';
      
      // Update status in firestore
      await db.collection(collectionName).doc(id).update({
        status,
        updatedAt: new Date()
      });

      return res.status(200).json({ message: `${type} status updated to ${status}.`, id });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error("Reports API Error:", error);
    return res.status(500).json({ error: "Server error in reports endpoint", details: error.message });
  }
};
