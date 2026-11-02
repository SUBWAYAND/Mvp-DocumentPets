import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  
  const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
  const userRole = sessionStorage.getItem("user_role") || localStorage.getItem("user_role");

  
  if (!token) {
    return <Navigate to="/login" replace />; 
  }

 
  if (allowedRole && userRole !== allowedRole) {

    if (userRole === "cliente") return <Navigate to="/dashboard" replace />;
    
  
    if (userRole === "veterinario") return <Navigate to="/veterinario" replace />;
  }

  return children;
}