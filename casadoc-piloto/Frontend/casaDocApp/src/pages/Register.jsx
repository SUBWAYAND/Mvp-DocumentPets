import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react"; 
import { peticionSegura } from "../api"; 

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  // Estados para seguridad legal y auditoría
  const [aceptaLegales, setAceptaLegales] = useState(false);
  const [modalLegal, setModalLegal] = useState({ isOpen: false, tipo: null });
  const VERSION_LEGALES = "v1.0"; 

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!name || !email || !password || !confirmPassword) {
      setError("Por favor, completa todos los campos obligatorios.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    // Validación de términos legales
    if (!aceptaLegales) {
      setError("Debes aceptar los términos y la política de datos para registrarte.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await peticionSegura("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          username: email,
          email: email,
          password: password,
          nombre_completo: name,
          rol: "cliente",
          version_legales: VERSION_LEGALES
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/verificar-cuenta", { state: { email: email } });
        }, 2000);
      } else {
        setError(data.error || "Ocurrió un error al registrarse.");
      }
    } catch (err) {
      setError("Tenemos problemas para conectarnos en este momento. Por favor, revisa tu conexión a internet o intenta de nuevo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] flex justify-center items-center p-4 font-sans relative">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-slate-100">
        
        <div className="flex flex-col items-center mb-6 text-center">
          <img 
            src="/logoCasadoc.png" 
            alt="Logo CasaDoc" 
            className="w-30 h-30 object-contain mb-2.5" 
          />
          <span className="text-xs font-bold uppercase tracking-widest text-[#00c3ff]">CasaDoc</span>
          <h1 className="text-xl font-medium text-slate-400 mt-0.5">Crear Cuenta</h1>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Registro de Propietario</h2>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3.5 text-xs font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl p-3.5 text-xs font-semibold text-center">
            ¡Registro casi listo! Te enviaremos a validar tu correo...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Nombre Completo *
            </label>
            <input
              type="text"
              name="name"
              placeholder="Nombre de Usuario"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading || success}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all font-medium disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Correo Electrónico *
            </label>
            <input
              type="email"
              name="email"
              autoComplete="off"
              placeholder="Ingresa tu correo electronico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || success}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all font-medium disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Contraseña *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || success}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-3.5 pr-11 py-2.5 text-sm focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all font-medium disabled:opacity-60"
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
              Confirmar Contraseña *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading || success}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-3.5 pr-11 py-2.5 text-sm focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all font-medium disabled:opacity-60"
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

          {/* CHECKBOX LEGAL (Diseño integrado) */}
          <div className="flex items-start gap-2.5 text-sm text-slate-600 my-5 px-1">
            <input
              type="checkbox"
              id="legales"
              checked={aceptaLegales}
              onChange={(e) => setAceptaLegales(e.target.checked)}
              disabled={isLoading || success}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-[#00c3ff] focus:ring-[#00c3ff] cursor-pointer disabled:opacity-60"
            />
            <label htmlFor="legales" className="leading-snug select-none">
              He leído y acepto los{' '}
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); setModalLegal({isOpen: true, tipo: 'terminos'})}} 
                className="text-blue-500 hover:text-blue-700 font-semibold transition-colors"
              >
                términos y condiciones
              </button>
              {' '}y la{' '}
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); setModalLegal({isOpen: true, tipo: 'privacidad'})}} 
                className="text-blue-500 hover:text-blue-700 font-semibold transition-colors"
              >
                política de tratamiento de datos
              </button>.
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full bg-[#00c3ff] hover:bg-[#00a6da] active:scale-98 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creando cuenta...</span>
              </>
            ) : (
              <span>Registrarse</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login" className="text-[#00c3ff] font-bold hover:underline">
            Inicia sesión aquí
          </Link>
        </div>

      </div>

      {/* MODAL DE DOCUMENTOS LEGALES (Sobreposición completa) */}
      {modalLegal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {modalLegal.tipo === 'terminos' ? 'Términos y Condiciones' : 'Política de Tratamiento de Datos'}
              </h3>
              <button 
                onClick={() => setModalLegal({isOpen: false, tipo: null})}
                className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer text-3xl leading-none"
              >&times;</button>
            </div>
            
            <div className="overflow-y-auto pr-4 text-sm text-slate-600 space-y-4">
              {modalLegal.tipo === 'terminos' ? (
                <>
                  <div className="text-xs mb-2"><strong>Última actualización:</strong> 05/09/2026</div>
                  <p>Bienvenido a CasaDoc Medicina Veterinaria. Al registrarte y utilizar nuestra aplicación, aceptas estos Términos y Condiciones de Uso.</p>
                  <p><strong>1. Uso de la aplicación:</strong> CasaDoc Medicina Veterinaria proporciona a sus clientes una plataforma para consultar y gestionar información relacionada con los servicios veterinarios prestados por la clínica, incluyendo información de mascotas, consultas, fórmulas, resultados de exámenes y otros documentos asociados. El usuario se compromete a utilizar la aplicación de manera responsable y únicamente para fines legítimos.</p>
                  <p><strong>2. Registro y cuenta:</strong> Para utilizar determinadas funciones de la aplicación, el usuario deberá registrarse y proporcionar información verdadera, completa y actualizada. El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y de cualquier actividad realizada desde su cuenta.</p>
                  <p><strong>3. Información de las mascotas:</strong> La información registrada en la aplicación relacionada con las mascotas será utilizada para facilitar la prestación, consulta y seguimiento de los servicios veterinarios ofrecidos por CasaDoc Medicina Veterinaria. El usuario es responsable de proporcionar información correcta y mantener actualizados sus datos cuando corresponda.</p>
                  <p><strong>4. Documentos e información veterinaria:</strong> La aplicación puede permitir la consulta de historias clínicas veterinarias, resultados de exámenes, fórmulas, imágenes y otros documentos relacionados con la atención de las mascotas. La información disponible en la aplicación corresponde a los registros generados o suministrados durante la atención veterinaria y no debe ser modificada, reproducida o utilizada para fines diferentes a los relacionados con la atención de la mascota, salvo autorización correspondiente.</p>
                  <p><strong>5. Seguridad y disponibilidad:</strong> CasaDoc Medicina Veterinaria implementará medidas razonables para proteger la información y mantener disponible la aplicación. Sin embargo, pueden presentarse interrupciones temporales por mantenimiento, actualizaciones, fallas técnicas, problemas de conectividad u otras circunstancias fuera del control de la clínica.</p>
                  <p><strong>6. Propiedad intelectual:</strong> Los contenidos, diseños, logotipos, textos, software y demás elementos propios de la aplicación pertenecen a CasaDoc Medicina Veterinaria o a sus respectivos titulares y están protegidos por las normas aplicables. No está permitido copiar, modificar, distribuir o utilizar estos elementos sin autorización.</p>
                  <p><strong>7. Suspensión de cuentas:</strong> CasaDoc Medicina Veterinaria podrá suspender o restringir temporalmente una cuenta cuando detecte un uso indebido de la aplicación, incumplimiento de estos términos o actividades que puedan afectar la seguridad de la plataforma o de otros usuarios.</p>
                  <p><strong>8. Tratamiento de datos personales:</strong> El tratamiento de los datos personales proporcionados por el usuario se realizará de acuerdo con la Política de Tratamiento de Datos Personales de CasaDoc Medicina Veterinaria y la normativa colombiana aplicable. El usuario podrá consultar dicha política en la aplicación.</p>
                  <p><strong>9. Aceptación:</strong> Al crear una cuenta, el usuario declara haber leído y aceptado estos Términos y Condiciones de Uso y se compromete a cumplirlos. CasaDoc Medicina Veterinaria podrá actualizar estos términos cuando sea necesario. Los cambios serán publicados en la aplicación y, cuando corresponda, se solicitará nuevamente la aceptación del usuario.</p>
                  <p><strong>10. Contacto:</strong> Si tienes preguntas relacionadas con estos términos, puedes comunicarte con CasaDoc Medicina Veterinaria a través de los canales oficiales de atención disponibles en la aplicación.</p>
                </>
              ) : (
                <>
                  <div className="text-xs mb-2"><strong>Última actualización:</strong> 05/09/2026</div>
                  <p>En CasaDoc Medicina Veterinaria nos comprometemos a proteger la información personal de nuestros clientes y a utilizarla únicamente para los fines relacionados con la prestación de nuestros servicios.</p>
                  
                  <p>
                      <strong>1. Responsable del tratamiento:</strong> CasaDoc Medicina Veterinaria es responsable del tratamiento de los datos personales recopilados a través de la aplicación.<br/>
                      Correo de contacto: <strong>contacto@ejemplo.com</strong><br/>
                      Dirección: <strong>Calle 44Norte #3AN-96 vipasa</strong>
                    </p>
                  
                  <p><strong>2. Datos que recopilamos:</strong> Para el registro y funcionamiento de la aplicación, recopilamos únicamente:</p>
                  <ul className="list-disc pl-5 mt-1 mb-3">
                    <li>Nombre completo.</li>
                    <li>Correo electrónico.</li>
                  </ul>
                  <p>También podemos almacenar información relacionada con las mascotas y los servicios veterinarios registrados en la aplicación.</p>
                  
                  <p><strong>3. ¿Para qué utilizamos los datos?</strong> Utilizamos los datos personales para:</p>
                  <ul className="list-disc pl-5 mt-1 mb-3">
                    <li>Crear y administrar la cuenta del cliente.</li>
                    <li>Identificar al cliente dentro de la aplicación.</li>
                    <li>Permitir el acceso a la información relacionada con sus mascotas.</li>
                    <li>Enviar comunicaciones relacionadas con los servicios veterinarios.</li>
                    <li>Atender solicitudes, consultas o requerimientos del cliente.</li>
                    <li>Mantener la seguridad y correcto funcionamiento de la aplicación.</li>
                    <li>Cumplir las obligaciones legales aplicables.</li>
                  </ul>
                  
                  <p><strong>4. Protección de la información:</strong> CasaDoc Medicina Veterinaria implementa medidas de seguridad razonables para proteger los datos personales contra pérdida, acceso no autorizado, modificación, divulgación o uso indebido.</p>
                  
                  <p><strong>5. Compartición de información:</strong> CasaDoc Medicina Veterinaria no vende ni comercializa los datos personales de sus clientes. La información podrá ser compartida únicamente cuando sea necesario para prestar los servicios, cumplir una obligación legal o atender un requerimiento de una autoridad competente.</p>
                  
                  <p><strong>6. Derechos del titular:</strong> El titular de los datos personales tiene derecho a:</p>
                  <ul className="list-disc pl-5 mt-1 mb-3">
                    <li>Conocer, actualizar y corregir sus datos.</li>
                    <li>Solicitar información sobre el uso de sus datos.</li>
                    <li>Solicitar la eliminación de sus datos cuando sea legalmente procedente.</li>
                    <li>Revocar la autorización para el tratamiento de sus datos cuando corresponda.</li>
                    <li>Presentar consultas o reclamos relacionados con el tratamiento de sus datos.</li>
                  </ul>
                  
                  <p><strong>7. Consultas y solicitudes:</strong> Para realizar consultas, actualizar información o presentar solicitudes relacionadas con sus datos personales, el cliente puede comunicarse con CasaDoc Medicina Veterinaria mediante el correo electrónico: <strong>contacto@ejemplo.com</strong></p>
                  
                  <p><strong>8. Vigencia y modificaciones:</strong> Esta política estará vigente mientras CasaDoc Medicina Veterinaria realice tratamiento de datos personales. Cualquier modificación será informada mediante la aplicación o los canales oficiales de comunicación.</p>
                  
                  <p><strong>9. Autorización:</strong> Al registrarse en CasaDoc, el usuario declara haber leído esta Política de Tratamiento de Datos Personales y autoriza a CasaDoc Medicina Veterinaria a realizar el tratamiento de sus datos personales de acuerdo con las finalidades descritas en esta política y la normativa colombiana aplicable.</p>
                </>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setModalLegal({isOpen: false, tipo: null})}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold transition-all cursor-pointer shadow-md"
              >
                Cerrar y volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}