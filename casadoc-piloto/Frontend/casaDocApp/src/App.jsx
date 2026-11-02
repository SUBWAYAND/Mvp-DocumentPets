import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner"; 
import ProtectedRoute from "./components/ProtectedRoute";


const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const VetDashboard = lazy(() => import("./pages/VetDashboard"));
const PetDetail = lazy(() => import("./pages/PetDetail"));
const RecuperarPassword = lazy(() => import("./pages/RecuperarPassword"));
const Perfil = lazy(() => import("./pages/Perfil"));
const VerificarCuenta = lazy(() => import("./pages/VerificarCuenta"));


const PantallaDeCarga = () => (
  <div className="min-h-screen bg-[#f7f5ee] flex flex-col justify-center items-center">
    <Loader2 className="w-10 h-10 animate-spin text-[#00c3ff] mb-4" />
    <p className="text-slate-400 font-medium text-sm">Cargando módulo CasaDoc...</p>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
  
      <Toaster richColors position="top-right" closeButton />

      {/* Suspense envuelve las rutas para mostrar el loader mientras baja el código */}
      <Suspense fallback={<PantallaDeCarga />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Ruta de Activación de Cuenta (OTP) */}
          <Route path="/verificar-cuenta" element={<VerificarCuenta />} />

          {/* Ruta de Recuperación de Contraseña */}
          <Route path="/recuperar-contrasena" element={<RecuperarPassword />} />

          {/* Ruta de Perfil de Usuario - Protegida para cualquier usuario logueado */}
          <Route 
            path="/perfil" 
            element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            } 
          />

          {/* Panel del Cliente - Protegido para rol 'cliente' */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRole="cliente">
                <ClientDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Panel del Veterinario - Protegido para rol 'veterinario' */}
          <Route 
            path="/veterinario" 
            element={
              <ProtectedRoute allowedRole="veterinario">
                <VetDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Detalle de Mascota - Protegido para cualquier usuario logueado */}
          <Route 
            path="/mascota" 
            element={
              <ProtectedRoute>
                <PetDetail />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<div className="p-10 text-center text-xl font-bold">404 - Página no encontrada</div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}