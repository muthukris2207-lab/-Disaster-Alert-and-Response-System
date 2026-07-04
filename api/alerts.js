// Serverless handler for /api/alerts
const { db, isConfigured, configError, verifyAdmin } = require('./_db');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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
      // Fetch alerts from Firestore
      const { location } = req.query;
      let query = db.collection('alerts').orderBy('timestamp', 'desc');

      const snapshot = await query.get();
      let alerts = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        alerts.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp ? data.timestamp.toDate() : null
        });
      });

      // Filter by location in Javascript if provided (so we can match location or 'All')
      if (location) {
        alerts = alerts.filter(alert => 
          alert.location.toLowerCase() === 'all' || 
          alert.location.toLowerCase() === location.toLowerCase()
        );
      }

      return res.status(200).json(alerts);

    } else if (req.method === 'POST') {
      // Publish new alert (Admin only)
      let decodedToken;
      try {
        decodedToken = await verifyAdmin(req);
      } catch (authErr) {
        return res.status(403).json({ error: authErr.message });
      }

      const { type, severity, location, message } = req.body;
      if (!type || !severity || !location || !message) {
        return res.status(400).json({ error: "Missing required alert fields (type, severity, location, message)." });
      }

      const newAlert = {
        type,
        severity, // Low, Medium, High, Critical
        location,
        message,
        timestamp: new Date(),
        status: 'Active',
        createdBy: decodedToken.uid
      };

      const docRef = await db.collection('alerts').add(newAlert);

      // Trigger FCM Push Notification to topic "disasters"
      let notificationSent = false;
      let notificationError = null;

      try {
        const { messaging } = require('./_db');
        const payload = {
          notification: {
            title: `🚨 DISASTER ALERT: ${type} (${severity})`,
            body: `Location: ${location}. ${message}`
          },
          data: {
            alertId: docRef.id,
            type,
            severity,
            location
          },
          topic: 'disasters'
        };

        await messaging.send(payload);
        notificationSent = true;
      } catch (fcmErr) {
        console.error("FCM sending failed:", fcmErr);
        notificationError = fcmErr.message;
      }

      return res.status(201).json({
        message: "Alert published successfully.",
        id: docRef.id,
        fcmBroadCast: notificationSent,
        fcmError: notificationError
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error("Alerts API Error:", error);
    return res.status(500).json({ error: "Server error in alerts endpoint", details: error.message });
  }
};
