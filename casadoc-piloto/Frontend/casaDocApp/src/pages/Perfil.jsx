import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Shield, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { peticionSegura } from "../api"; 

export default function Perfil() {
  const navigate = useNavigate();

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("");
  
  // Estados para cambio de contraseña
  const [passwordActual, setPasswordActual] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  // Cargar datos del perfil al abrir la vista
  useEffect(() => {
    const fetchPerfil = async () => {
      // 👇 LÓGICA ACTUALIZADA: Buscamos el token en ambas memorias
      const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
      
      // Validación temprana: si no hay token en ninguna parte, lo mandamos al login de inmediato
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        // USAMOS PETICIÓN SEGURA (Maneja la URL base y los tokens automáticamente)
        const response = await peticionSegura("/api/auth/perfil/", {
          method: "GET"
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setNombreCompleto(data.nombre_completo || "");
          setEmail(data.email || "");
          setRol(data.rol || "cliente");
        } else {
          setError("No se pudo cargar la información del perfil.");
        }
      } catch (err) {
        setError("Error de conexión con el servidor.");
      }
    };

    fetchPerfil();
  }, [navigate]);

  // Manejar la actualización del perfil
  const handleActualizarPerfil = async (e) => {
    e.preventDefault();
    setError("");
    setMensajeExito("");

    if (nuevaPassword && nuevaPassword !== confirmarPassword) {
      setError("Las nuevas contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    const bodyData = {
      nombre_completo: nombreCompleto,
      email: email,
    };

    if (passwordActual && nuevaPassword) {
      bodyData.password_actual = passwordActual;
      bodyData.nueva_password = nuevaPassword;
    }

    try {
      // USAMOS PETICIÓN SEGURA PARA ACTUALIZAR
      const response = await peticionSegura("/api/auth/perfil/", {
        method: "PUT",
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();

      if (response.ok) {
        // 🔴 LÓGICA DE SEGURIDAD: Si cambió la contraseña, matamos la sesión local
        if (passwordActual && nuevaPassword) {
          alert("Contraseña cambiada exitosamente. Por seguridad, debes iniciar sesión de nuevo.");
          localStorage.clear();
          sessionStorage.clear();
          navigate("/login");
          return; // Detenemos la ejecución aquí
        }

        // Si solo actualizó datos normales (nombre, correo)
        setMensajeExito("¡Perfil actualizado correctamente!");
        
        // Actualizamos el nombre en el navegador por si cambió
        if (data.nombre_completo) {
          // Guardamos en la memoria que esté activa (por si usó o no Recordarme)
          const storage = sessionStorage.getItem("access_token") ? sessionStorage : localStorage;
          storage.setItem("user_name", data.nombre_completo);
        }

        // Limpiamos los campos de clave por precaución
        setPasswordActual("");
        setNuevaPassword("");
        setConfirmarPassword("");
      } else {
        setError(data.error || "Error al actualizar los datos.");
      }
    } catch (err) {
      setError("Error de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] flex justify-center items-center p-4 font-sans">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-slate-100">
        
        {/* Cabecera con Logo */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img 
            src="/logoCasadoc.png" 
            alt="Logo CasaDoc" 
            className="w-30 h-30 object-contain mb-2.5" 
          />
          <span className="text-xs font-bold uppercase tracking-widest text-[#00c3ff]">
            Mi Cuenta CasaDoc
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Configuración de Perfil</h1>
          
          {/* Badge del Rol Actual */}
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-100 text-[#00c3ff] rounded-full text-xs font-bold uppercase">
            <Shield className="w-3.5 h-3.5" />
            Rol: {rol}
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3.5 text-xs font-semibold text-center">
            {error}
          </div>
        )}
        {mensajeExito && (
          <div className="mb-4 bg-green-50 border border-green-100 text-green-600 rounded-xl p-3.5 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {mensajeExito}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleActualizarPerfil} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Nombre Completo
            </label>
            <div className="relative">
              <input
                type="text"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c3ff] text-slate-800 rounded-xl pl-3.5 pr-3.5 py-2.5 text-sm focus:outline-hidden focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c3ff] text-slate-800 rounded-xl pl-3.5 pr-3.5 py-2.5 text-sm focus:outline-hidden focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <hr className="border-slate-100 my-4" />

          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Cambiar Contraseña (Opcional)
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Contraseña Actual
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c3ff] text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Nueva Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c3ff] text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c3ff] text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:bg-white transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00c3ff] hover:bg-[#00a6da] active:scale-98 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
            <span>{isLoading ? "Guardando..." : "Guardar Cambios"}</span>
          </button>
        </form>

        {/* Botón para regresar al panel principal */}
        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          <button 
            onClick={() => navigate(-1)} 
            className="text-slate-400 hover:text-[#00c3ff] transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver atrás
          </button>
        </div>

      </div>
    </div>
  );
}