// Serverless handler for /api/users (Admin user management)
const { db, auth, isConfigured, configError, verifyAdmin } = require('./_db');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
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
    // Verify user is Admin
    try {
      await verifyAdmin(req);
    } catch (authErr) {
      return res.status(403).json({ error: authErr.message });
    }

    if (req.method === 'GET') {
      // List all users from Firestore
      const usersSnapshot = await db.collection('users').get();
      const users = [];
      usersSnapshot.forEach(doc => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return res.status(200).json(users);

    } else if (req.method === 'PUT') {
      // Deactivate / Activate user (Toggle disabled state)
      const { uid, disabled } = req.body;
      if (!uid || disabled === undefined) {
        return res.status(400).json({ error: "Missing required parameters (uid, disabled)." });
      }

      // Update in Firebase Auth
      await auth.updateUser(uid, { disabled: disabled === true });

      // Update status in Firestore
      await db.collection('users').doc(uid).update({
        disabled: disabled === true,
        updatedAt: new Date()
      });

      return res.status(200).json({ message: `User status updated. Disabled: ${disabled}`, uid });

    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error("Users Management API Error:", error);
    return res.status(500).json({ error: "Server error in users endpoint", details: error.message });
  }
};
