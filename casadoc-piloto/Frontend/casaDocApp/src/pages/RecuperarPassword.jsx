import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, Eye, EyeOff, Loader2, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { peticionSegura } from "../api"; 

export default function RecuperarPassword() {
  const navigate = useNavigate();

  // Fases: 1 = Pedir Correo, 2 = Pedir Código, 3 = Nueva Contraseña
  const [fase, setFase] = useState(1);

  // Estados para los campos
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Estados de control visual
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  // Temporizador para el reenvío del código (30 segundos)
  const [tiempoEspera, setTiempoEspera] = useState(0);

  useEffect(() => {
    let intervalo;
    if (tiempoEspera > 0) {
      intervalo = setInterval(() => {
        setTiempoEspera((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [tiempoEspera]);

  // FASE 1 y REENVÍO: Solicitar el código al backend
  const handleSolicitarCodigo = async (e, esReenvio = false) => {
    if (e) e.preventDefault();
    setError("");
    setMensajeExito("");

    if (!email) {
      setError("Por favor, ingresa tu correo electrónico.");
      return;
    }

    setIsLoading(true);

    try {
      
      const response = await peticionSegura("/api/auth/solicitar-codigo/", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setTiempoEspera(30);
        if (esReenvio) {
          setMensajeExito("Te hemos enviado un nuevo código.");
        } else {
          setFase(2); 
        }
      } else {
        setError(data.error || "No existe un usuario registrado con este correo.");
      }
    } catch (err) {
      setError("Error de conexión con el servidor backend.");
    } finally {
      setIsLoading(false);
    }
  };

  // FASE 2: Validar el código estrictamente contra el backend
  const handleAvanzarFase3 = async (e) => {
    e.preventDefault();
    setError("");
    setMensajeExito("");

    if (codigo.trim().length !== 6) {
      setError("El código debe tener exactamente 6 dígitos.");
      return;
    }
    
    setIsLoading(true);

    try {
      // 👇 LLAMADO 2: Petición segura para validar código
      const response = await peticionSegura("/api/auth/validar-codigo/", {
        method: "POST",
        body: JSON.stringify({ email: email, codigo: codigo }),
      });

      const data = await response.json();

      if (response.ok) {
        setMensajeExito("¡Código correcto!");
        
        setTimeout(() => {
          setMensajeExito(""); 
          setFase(3); 
        }, 1500);

      } else {
        setError("Código inválido, intente de nuevo.");
      }
    } catch (err) {
      setError("Error de conexión con el servidor. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // FASE 3: Enviar correo, código y nueva contraseña a Django
  const handleRestablecer = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Por favor, completa ambas contraseñas.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden. Verífilas.");
      return;
    }

    setIsLoading(true);

    try {
      // 👇 LLAMADO 3: Petición segura para restablecer contraseña
      const response = await peticionSegura("/api/auth/restablecer-password/", {
        method: "POST",
        body: JSON.stringify({ 
          email: email, 
          codigo: codigo, 
          nueva_password: password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMensajeExito("¡Contraseña restablecida exitosamente! Redirigiendo al login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(data.error || "El código es incorrecto o ha expirado.");
        setFase(2); 
      }
    } catch (err) {
      setError("Hubo un error de conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] flex justify-center items-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-slate-100">
        
        {/* LOGO E IDENTIDAD VISUAL */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img 
            src="/logoCasadoc.png" 
            alt="Logo CasaDoc" 
            className="w-30 h-30 object-contain mb-2.5" 
          />
          <span className="text-xs font-bold uppercase tracking-widest text-[#00c3ff]">
            Seguridad CasaDoc
          </span>
          <h1 className="text-xl font-medium text-slate-400 mt-0.5">
            {fase === 1 && "Recuperar Acceso"}
            {fase === 2 && "Verificar Código"}
            {fase === 3 && "Crear Nueva Clave"}
          </h1>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">
            {fase === 1 && "¿Olvidaste tu contraseña?"}
            {fase === 2 && "Ingresa tu código"}
            {fase === 3 && "Casi listo"}
          </h2>
          <p className="text-xs text-slate-400 mt-2 px-2">
            {fase === 1 && "Ingresa tu correo y te enviaremos un código de seguridad de 6 dígitos."}
            {fase === 2 && (
              <>Hemos enviado un código de seguridad de 6 dígitos a <strong>{email}</strong>.</>
            )}
            {fase === 3 && "Ingresa tu nueva contraseña dos veces para confirmar la coincidencia."}
          </p>
        </div>

        {/* Alertas Dinámicas */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3.5 text-xs font-semibold animate-fade-in text-center">
            {error}
          </div>
        )}
        {mensajeExito && (
          <div className="mb-4 bg-green-50 border border-green-100 text-green-600 rounded-xl p-3.5 text-xs font-semibold text-center flex items-center justify-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            {mensajeExito}
          </div>
        )}

        {/* FASE 1: Solicitar Correo */}
        {fase === 1 && (
          <form onSubmit={(e) => handleSolicitarCodigo(e, false)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c3ff] text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:bg-white transition-all font-medium disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#00c3ff] hover:bg-[#00a6da] active:scale-98 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              <span>{isLoading ? "Enviando..." : "Solicitar Código"}</span>
            </button>
          </form>
        )}

        {/* FASE 2: Ingresar Código y Reenviar */}
        {fase === 2 && !mensajeExito.includes("Redirigiendo") && (
          <form onSubmit={handleAvanzarFase3} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">
                Código de Seguridad
              </label>
              <input
                type="text"
                placeholder="123456"
                maxLength="6"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                disabled={isLoading || mensajeExito !== ""}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c3ff] text-slate-800 rounded-xl px-3.5 py-3 text-lg focus:outline-hidden focus:bg-white transition-all font-bold text-center tracking-[0.5em] disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || codigo.length < 6 || mensajeExito !== ""}
              className={`w-full ${mensajeExito ? "bg-green-500" : "bg-slate-800 hover:bg-slate-900"} active:scale-98 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 mt-2`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando código...</span>
                </>
              ) : mensajeExito ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Validado!</span>
                </>
              ) : (
                <>
                  <span>Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                disabled={isLoading || tiempoEspera > 0 || mensajeExito !== ""}
                onClick={(e) => handleSolicitarCodigo(e, true)}
                className="text-xs font-bold text-slate-500 hover:text-[#00c3ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 w-full"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                {tiempoEspera > 0 
                  ? `Volver a solicitar en ${tiempoEspera}s` 
                  : "Volver a solicitar código"}
              </button>
            </div>
          </form>
        )}

        {/* FASE 3: Crear nueva contraseña */}
        {fase === 3 && !mensajeExito.includes("Redirigiendo") && (
          <form onSubmit={handleRestablecer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Ingrese nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c3ff] text-slate-800 rounded-xl pl-3.5 pr-11 py-2.5 text-sm focus:outline-hidden focus:bg-white transition-all font-medium disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Ingrese nueva contraseña (Confirmación)
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c3ff] text-slate-800 rounded-xl pl-3.5 pr-11 py-2.5 text-sm focus:outline-hidden focus:bg-white transition-all font-medium disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#00c3ff] hover:bg-[#00a6da] active:scale-98 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{isLoading ? "Validando..." : "Restablecer Contraseña"}</span>
            </button>
          </form>
        )}

        {/* Botón Volver al login */}
        {!mensajeExito.includes("Redirigiendo") && (
          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            <Link to="/login" className="text-slate-400 hover:text-[#00c3ff] transition-colors">
              ← Volver al inicio de sesión
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}