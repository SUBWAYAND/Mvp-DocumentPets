import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Loader2, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react"; 
import { peticionSegura } from "../api"; 

export default function VerificarCuenta() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [codigo, setCodigo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  // Temporizador para el reenvío del código (120 segundos / 2 minutos)
  const [tiempoEspera, setTiempoEspera] = useState(120);

  useEffect(() => {
    let intervalo;
    if (tiempoEspera > 0) {
      intervalo = setInterval(() => {
        setTiempoEspera((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [tiempoEspera]);

  if (!email) {
    navigate("/register");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensajeExito("");

    if (codigo.trim().length !== 6) {
      setError("El código debe tener exactamente 6 dígitos.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await peticionSegura("/api/auth/activar-cuenta/", {
        method: "POST",
        body: JSON.stringify({ email: email, codigo: codigo }),
      });

      const data = await response.json();

      if (response.ok) {
        setMensajeExito("¡Cuenta verificada y activada con éxito!");
        
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(data.error || "El código es incorrecto o ha expirado.");
      }
    } catch (err) {
      setError("Error de conexión. Verifica que el servidor backend esté corriendo.");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para volver a solicitar el código
  const handleReenviarCodigo = async () => {
    setError("");
    setMensajeExito("");
    setIsLoading(true);

    try {
      const response = await peticionSegura("/api/auth/reenviar-activacion/", {
        method: "POST",
        body: JSON.stringify({ email: email })
      });

      const data = await response.json();

      if (response.ok) {
        setMensajeExito("¡Se ha enviado un nuevo código a tu correo!");
        setTiempoEspera(120); // Reiniciamos el temporizador a 2 minutos
        setTimeout(() => setMensajeExito(""), 4000); // Limpiamos el mensaje de éxito después de 4s
      } else {
        setError(data.error || "No se pudo reenviar el código.");
      }
    } catch (err) {
      setError("Error de conexión al intentar reenviar el código.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] flex justify-center items-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-slate-100">
        
        {/* Identidad Visual */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img 
            src="/logoCasadoc.png" 
            alt="Logo CasaDoc" 
            className="w-30 h-30 object-contain mb-2.5" 
          />
          <span className="text-xs font-bold uppercase tracking-widest text-[#00c3ff]">
            Seguridad CasaDoc
          </span>
          <h1 className="text-xl font-medium text-slate-400 mt-0.5">Activar Cuenta</h1>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Verifica tu correo</h2>
          <p className="text-xs text-slate-400 mt-2 px-2">
            Hemos enviado un código de seguridad de 6 dígitos a <strong className="text-slate-600">{email}</strong>. 
            Tienes <strong>2 minutos</strong> para ingresarlo.
          </p>
        </div>

        {/* Alertas Dinámicas */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3.5 text-xs font-semibold animate-fade-in text-center">
            {error}
          </div>
        )}
        {mensajeExito && (
          <div className="mb-4 bg-green-50 border border-green-100 text-green-600 rounded-xl p-3.5 text-xs font-semibold text-center flex flex-col items-center justify-center gap-1 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 mb-1" />
            <span>{mensajeExito}</span>
            {mensajeExito.includes("éxito") && (
              <span className="font-normal text-[10px] mt-1 opacity-80">Redirigiendo al inicio de sesión...</span>
            )}
          </div>
        )}

        {/* Formulario */}
        {!mensajeExito.includes("Redirigiendo") && (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                disabled={isLoading}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c3ff] text-slate-800 rounded-xl px-3.5 py-3 text-lg focus:outline-hidden focus:bg-white transition-all font-bold text-center tracking-[0.5em] disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || codigo.length < 6}
              className="w-full bg-slate-800 hover:bg-slate-900 active:scale-98 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando código...</span>
                </>
              ) : (
                <>
                  <span>Activar mi cuenta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Botón dinámico de reenvío de código */}
            <div className="text-center pt-2">
              <button
                type="button"
                disabled={isLoading || tiempoEspera > 0}
                onClick={handleReenviarCodigo}
                className="text-xs font-bold text-slate-500 hover:text-[#00c3ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 w-full cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {tiempoEspera > 0 
                  ? `Reenviar código en ${Math.floor(tiempoEspera / 60)}:${String(tiempoEspera % 60).padStart(2, '0')}` 
                  : "Volver a solicitar código"}
              </button>
            </div>
          </form>
        )}

        {/* Opciones extra */}
        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          ¿Te equivocaste de correo?{" "}
          <Link to="/register" className="text-slate-400 hover:text-red-500 transition-colors">
            Cancelar registro
          </Link>
        </div>

      </div>
    </div>
  );
}