import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { peticionSegura } from "../api"; 

export default function Login() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await peticionSegura("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ 
          username: email, 
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.clear();
        sessionStorage.clear();

        const storage = rememberMe ? localStorage : sessionStorage;

        storage.setItem("access_token", data.access);
        storage.setItem("user_role", data.rol);
        
        const nombreParaMostrar = data.first_name || data.nombre_completo || data.username || "Cliente";
        storage.setItem("user_name", nombreParaMostrar);

        if (data.rol === "veterinario") {
          navigate("/veterinario");
        } else {
          navigate("/dashboard");
        }
      } else {
        
        setError(data.error || "Credenciales incorrectas. Verifica tu correo y contraseña.");
      }
    } catch (err) {
      setError("¡Error de conexion, tenemos problemas para conectarnos en este momento!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] flex justify-center items-center p-0 sm:p-4 font-sans">
      
      {/* 📱 CONTENEDOR RESPONSIVO */}
      <div className="bg-white w-full min-h-screen sm:min-h-0 sm:max-w-md rounded-none sm:rounded-3xl p-6 sm:p-8 shadow-none sm:shadow-[0_4px_30px_rgba(0,0,0,0.03)] border-0 sm:border border-slate-100 flex flex-col justify-center">
        
        <div className="flex flex-col items-center mb-6 text-center">
          <img 
            src="/logoCasadoc.png" 
            alt="Logo CasaDoc" 
            className="w-24 h-24 sm:w-30 sm:h-30 object-contain mb-2.5" 
          />
          <span className="text-xs font-bold uppercase tracking-widest text-[#00c3ff]">CasaDoc</span>
          <h1 className="text-xl font-medium text-slate-400 mt-0.5">Medicina Veterinaria</h1>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Iniciar sesión</h2>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3.5 text-xs font-semibold animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Correo Electrónico (Usuario)
            </label>
            <input
              type="text"
              name="username"
              autoComplete="email" 
              placeholder="correo electronico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className={`w-full bg-slate-50 border ${
                error && !email ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-[#00c3ff]"
              } text-slate-800 rounded-xl px-3.5 py-3 sm:py-2.5 text-sm focus:outline-hidden focus:bg-white transition-all font-medium disabled:opacity-60`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className={`w-full bg-slate-50 border ${
                  error && !password ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-[#00c3ff]"
                } text-slate-800 rounded-xl pl-3.5 pr-11 py-3 sm:py-2.5 text-sm focus:outline-hidden focus:bg-white transition-all font-medium disabled:opacity-60`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-500 font-medium cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)} 
                className="accent-[#00c3ff] rounded-sm cursor-pointer w-4 h-4" 
              />
              Recordarme
            </label>
            
            <Link to="/recuperar-contrasena" className="text-[#00c3ff] font-bold hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00c3ff] hover:bg-[#00a6da] active:scale-98 text-white font-bold py-3.5 sm:py-3 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <span>Iniciar Sesión</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          ¿No tienes una cuenta?{" "}
          <Link to="/register" className="text-[#00c3ff] font-bold hover:underline">
            Regístrate aquí
          </Link>
        </div>

      </div>
    </div>
  );
}