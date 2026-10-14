const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Accès interdit. Rôle(s) autorisé(s) : ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
};

module.exports = checkRole;