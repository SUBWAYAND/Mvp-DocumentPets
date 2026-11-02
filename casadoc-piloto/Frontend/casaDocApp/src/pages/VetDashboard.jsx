import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Upload, ChevronRight, Stethoscope, X, FileText, Search, Loader2, Dog, Clock, ChevronLeft, Trash2 } from "lucide-react";
import { peticionSegura, getStoredValue } from "../api";
import { toast } from "sonner";

export default function VetDashboard() {
  const navigate = useNavigate();
  const [vetName, setVetName] = useState("Doctor(a)");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTermModal, setSearchTermModal] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // --- ESTADOS PARA PROMOCIONES (NUEVO GESTOR) ---
  const [modalPromoAdmin, setModalPromoAdmin] = useState(false);
  const [nuevaPromo, setNuevaPromo] = useState({ titulo: "", imagenBase64: "", filePreview: "" });
  const [subiendoPromo, setSubiendoPromo] = useState(false);
  const [promociones, setPromociones] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(false);

  const [searchDashboard, setSearchDashboard] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pacientes, setPacientes] = useState([]);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [totalDocsSubidos, setTotalDocsSubidos] = useState(0);

  const [nuevoDoc, setNuevoDoc] = useState({
    mascotaId: "",
    tipo: "Fórmula Médica",
    archivoBase64: ""
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("#paciente-buscador-container")) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const role = getStoredValue("user_role");
    const name = getStoredValue("user_name");
    
    if (role !== "veterinario") {
      navigate("/");
      return;
    }
    if (name) setVetName(name);

    const fetchDocsCount = async () => {
      try {
        const resDocs = await peticionSegura("/api/documentos/");
        if (resDocs.ok) {
          const dataDocs = await resDocs.json();
          setTotalDocsSubidos(dataDocs.count !== undefined ? dataDocs.count : dataDocs.length);
        }
      } catch (error) {
        console.error("Error al cargar documentos", error);
      }
    };
    fetchDocsCount();
  }, [navigate]);

  useEffect(() => {
    const fetchPacientesServidor = async () => {
      setIsLoading(true);
      try {
        let url = `/api/mascotas/?page=${currentPage}`;
        if (searchDashboard) {
          url += `&search=${searchDashboard}`;
        }

        const resMascotas = await peticionSegura(url);
        if (resMascotas.ok) {
          const dataMascotas = await resMascotas.json();
          setPacientes(dataMascotas.results || dataMascotas);
          setTotalPacientes(dataMascotas.count !== undefined ? dataMascotas.count : (dataMascotas.results ? dataMascotas.results.length : dataMascotas.length));
          setHasNext(!!dataMascotas.next);
          setHasPrev(!!dataMascotas.previous);
        } else if (resMascotas.status === 401) {
          localStorage.clear();
          sessionStorage.clear();
          navigate("/login");
        }
      } catch (error) {
        console.error("Error al conectar con el servidor", error);
        toast.error("Error al sincronizar con el servidor.");
      } finally {
        setIsLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchPacientesServidor();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchDashboard, navigate]);

  const handleSearchDashboardChange = (e) => {
    setSearchDashboard(e.target.value);
    setCurrentPage(1);
  };

  const handleLogout = async () => {
    try {
      await peticionSegura("/api/auth/logout/", {
        method: "POST",
      });
    } catch (error) {
      console.error("Error al cerrar sesión en el servidor", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear(); 
      toast.success("Sesión cerrada correctamente.");
      navigate("/");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNuevoDoc(prev => ({ ...prev, archivoBase64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- FUNCIONES GESTIÓN DE PROMOCIONES ---
  const cargarPromociones = async () => {
    setLoadingPromos(true);
    try {
      const res = await peticionSegura('/api/promociones/');
      if (res.ok) {
        const data = await res.json();
        setPromociones(data.results || data);
      }
    } catch (e) {
      toast.error("Error al cargar promociones.");
    } finally {
      setLoadingPromos(false);
    }
  };

  const abrirModalPromos = () => {
    setModalPromoAdmin(true);
    cargarPromociones();
  };

  const eliminarPromo = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este aviso publicitario?")) return;
    try {
      const res = await peticionSegura(`/api/promociones/${id}/`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Aviso eliminado correctamente");
        setPromociones(promociones.filter(p => p.id !== id));
      } else {
        toast.error("No se pudo eliminar el aviso");
      }
    } catch (e) {
      toast.error("Error de conexión al intentar eliminar");
    }
  };

  // --- COMPRESOR INTEGRADO DE IMÁGENES PARA PROMOCIONES ---
  const handleFilePromo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compresión automática a JPEG (calidad 75%) para evitar errores 413
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);

        setNuevaPromo(prev => ({ 
          ...prev, 
          imagenBase64: compressedDataUrl,
          filePreview: compressedDataUrl
        }));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubirPromo = async (e) => {
    e.preventDefault();
    if (!nuevaPromo.titulo || !nuevaPromo.imagenBase64) {
      toast.error("El título y la imagen son obligatorios");
      return;
    }
    setSubiendoPromo(true);
    try {
      const res = await peticionSegura('/api/promociones/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: nuevaPromo.titulo,
          imagen_url: nuevaPromo.imagenBase64
        })
      });
      if (res.ok) {
        toast.success("Promoción publicada con éxito");
        setNuevaPromo({ titulo: "", imagenBase64: "", filePreview: "" });
        cargarPromociones();
      } else {
        toast.error("Error al publicar promoción");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setSubiendoPromo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nuevoDoc.mascotaId) {
      toast.error("Por favor, selecciona una mascota válida mediante el buscador.");
      return;
    }

    if (!nuevoDoc.archivoBase64) {
      toast.error("¡Atención! Debes adjuntar un archivo (PDF, PNG o JPG) antes de guardar el registro médico.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      mascota: nuevoDoc.mascotaId,
      titulo: nuevoDoc.tipo,
      tipo: nuevoDoc.tipo,
      medico: vetName,
      descripcion: "Diagnóstico y prescripción oficial emitida desde el consultorio.",
      archivo_url: nuevoDoc.archivoBase64
    };

    try {
      const response = await peticionSegura("/api/documentos/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`¡${nuevoDoc.tipo} guardado con éxito en el historial del paciente!`);
        setIsModalOpen(false);
        setNuevoDoc({ mascotaId: "", tipo: "Fórmula Médica", archivoBase64: "" });
        setSearchTermModal("");
        setIsDropdownOpen(false);
        
        const resDocs = await peticionSegura("/api/documentos/");
        if (resDocs.ok) {
          const dataDocs = await resDocs.json();
          setTotalDocsSubidos(dataDocs.count !== undefined ? dataDocs.count : dataDocs.length);
        }
      } else {
        const errData = await response.json();
        toast.error(errData.error || errData.detalle || "Error al guardar el documento.");
      }
    } catch (error) {
      toast.error("Error de conexión con el backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pacientesFiltradosModal = pacientes.filter(p =>
    p.nombre.toLowerCase().includes(searchTermModal.toLowerCase()) ||
    (p.owner_username && p.owner_username.toLowerCase().includes(searchTermModal.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#f7f5ee] flex flex-col lg:flex-row font-sans">
      
      <div className="bg-[#00c3ff] w-full lg:w-80 xl:w-96 p-6 lg:min-h-screen lg:sticky lg:top-0 text-white shadow-md flex flex-col justify-between flex-shrink-0 z-10">
        <div>
          <div className="mb-4 lg:mb-10 flex justify-between lg:block items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-md">Consultorio</span>
              <h1 className="text-base lg:text-lg font-light tracking-tight mt-1 lg:mt-2 text-cyan-50">Clínica Veterinaria</h1>
            </div>
            <div className="flex lg:hidden gap-2">
              <button onClick={handleLogout} className="p-2.5 bg-white/10 rounded-full cursor-pointer" title="Cerrar sesión">
                <LogOut className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-start mb-6 lg:mb-8">
            <div className="w-full pr-2">
              <span className="text-cyan-100 text-xs font-medium tracking-wide opacity-80">Doctor(a)</span>
              <h2 className="text-xl lg:text-2xl font-bold tracking-tight mt-0.5 break-words">{vetName}</h2>
            </div>
            <div className="hidden lg:flex gap-2.5 flex-shrink-0">
              <button className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer">
                <Stethoscope className="w-5 h-5 text-white" />
              </button>
              <button onClick={handleLogout} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer" title="Cerrar sesión">
                <LogOut className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-[#e07a5f] hover:bg-[#d6684c] active:scale-98 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 text-sm group mb-3"
          >
            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span>Subir documento médico</span>
          </button>

          {/* --- BOTÓN DE GESTIÓN DE PROMOCIONES --- */}
          <button 
            onClick={abrirModalPromos}
            className="w-full bg-[#00a6da] hover:bg-[#0092c2] active:scale-98 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 text-sm group"
          >
            <FileText className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span>Gestionar Promociones</span>
          </button>

        </div>

        <div className="hidden lg:block pt-6 border-t border-white/10 text-xs text-cyan-100/60 font-medium">
          © {new Date().getFullYear()} CasaDoc App.
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-12 flex-1 max-w-4xl mx-auto w-full flex flex-col justify-between">
        <div className="w-full">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800">Pacientes recientes</h2>
              <p className="text-xs text-slate-400 mt-0.5">Haz clic en un paciente para inspeccionar su historial clínico completo.</p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre o raza..."
                value={searchDashboard}
                onChange={handleSearchDashboardChange}
                className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs md:text-sm font-medium focus:outline-hidden focus:border-[#00c3ff] transition-all shadow-2xs"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#00c3ff]" />
            </div>
          ) : (
            <div>
              <div className="space-y-3.5 mb-6">
                {pacientes.length > 0 ? (
                  pacientes.map((paciente) => (
                    <div 
                      key={paciente.id} 
                      onClick={() => navigate(`/mascota?id=${paciente.id}`)}
                      className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100/70 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400 overflow-hidden group-hover:bg-cyan-50 group-hover:text-[#00c3ff] transition-colors flex-shrink-0">
                          {(paciente.imagen_url || paciente.imagen) ? (
                            <img src={paciente.imagen_url || paciente.imagen} alt={paciente.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <Dog className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <h3 className="font-bold text-slate-800 text-base md:text-lg truncate">{paciente.nombre}</h3>
                            <span className="text-xs text-slate-400 font-medium hidden sm:inline">({paciente.raza})</span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">Dueño registrado en sistema</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#00c3ff] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center text-slate-400 font-medium">
                    No se encontraron pacientes que coincidan con la búsqueda.
                  </div>
                )}
              </div>

              {(hasPrev || hasNext) && (
                <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-2xs mb-8">
                  <button
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={!hasPrev}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>

                  <span className="text-xs font-semibold text-slate-500">
                    Página <strong className="text-slate-800">{currentPage}</strong>
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!hasNext}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-5 pt-2">
          <div className="bg-white rounded-2xl p-4 text-center border border-slate-100 flex flex-col justify-center items-center">
            <Clock className="w-6 h-6 text-slate-300 mb-2" />
            <p className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wide leading-tight">
              Módulo para futura actualización
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 text-center border border-slate-100 flex flex-col justify-center items-center">
            <span className="text-2xl font-bold text-[#e07a5f]">{totalDocsSubidos}</span>
            <p className="text-[11px] md:text-xs text-slate-400 font-bold mt-1">Docs. Subidos</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 text-center border border-slate-100 flex flex-col justify-center items-center">
            <Clock className="w-6 h-6 text-slate-300 mb-2" />
            <p className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wide leading-tight">
              Módulo para futura actualización
            </p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            
            <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full cursor-pointer transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00c3ff]" />
                Nuevo Registro Médico
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Adjunta prescripciones o reportes al historial de la mascota (Máx. 2MB).</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="relative" id="paciente-buscador-container">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Seleccionar Paciente *</label>
                <input
                  type="text"
                  placeholder="Escribe el nombre de la mascota..."
                  value={searchTermModal}
                  onChange={(e) => {
                    setSearchTermModal(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all font-medium"
                />

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-50">
                    {pacientesFiltradosModal.length > 0 ? (
                      pacientesFiltradosModal.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setNuevoDoc(prev => ({ ...prev, mascotaId: p.id }));
                            setSearchTermModal(`${p.nombre} (${p.raza})`);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors flex justify-between items-center cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{p.nombre}</span>
                            <span className="text-slate-400 font-normal text-xs ml-1.5">({p.raza})</span>
                          </div>
                          <span className="text-[11px] bg-cyan-50 text-[#00c3ff] px-2 py-0.5 rounded-md font-semibold">Paciente</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400 font-medium bg-slate-50 text-center">No se encontraron mascotas.</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre del documento a subir *</label>
                <select 
                  name="tipo" 
                  value={nuevoDoc.tipo} 
                  onChange={(e) => setNuevoDoc(prev => ({ ...prev, tipo: e.target.value }))} 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all"
                >
                  <option value="Fórmula Médica">Fórmula Médica</option>
                  <option value="Historia Clínica Completa">Historia Clínica Completa</option>
                  <option value="Exámenes de Laboratorio">Exámenes de Laboratorio</option>
                  <option value="Radiografía">Radiografía</option>
                  <option value="Ecografías">Ecografías</option>
                  <option value="Certificados">Certificados</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Adjuntar Archivo (PDF, PNG, JPG - Máx 2MB)</label>
                <label className="w-full border-2 border-dashed border-slate-200 hover:border-[#00c3ff] bg-slate-50/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors group">
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-[#00c3ff] transition-colors" />
                  <span className="text-xs font-semibold text-slate-600">
                    {nuevoDoc.archivoBase64 ? "¡Archivo adjuntado correctamente!" : "Haz clic para examinar"}
                  </span>
                  <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf, image/*" />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer text-center">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 bg-[#e07a5f] hover:bg-[#d6684c] text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar Registro"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE GESTIÓN DE PROMOCIONES --- */}
      {modalPromoAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button onClick={() => setModalPromoAdmin(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-5 flex-shrink-0">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00c3ff]" />
                Gestionar Promociones
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Sube nuevas promociones o elimina los avisos antiguos.</p>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-6 flex-1">
              
              {/* Formulario de subida */}
              <form onSubmit={handleSubirPromo} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-700 text-sm">Crear un Nuevo Aviso</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Título del Aviso *</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Descuento en Vacunas"
                    value={nuevaPromo.titulo}
                    onChange={(e) => setNuevaPromo({...nuevaPromo, titulo: e.target.value})}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-hidden focus:border-[#00c3ff] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Imagen Promocional *</label>
                  <label className="w-full border-2 border-dashed border-slate-200 hover:border-[#00c3ff] bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden h-32 relative">
                    {nuevaPromo.filePreview ? (
                      <img src={nuevaPromo.filePreview} alt="Preview" className="w-full h-full object-cover absolute inset-0 opacity-50" />
                    ) : (
                      <Upload className="w-6 h-6 text-slate-400" />
                    )}
                    <span className="text-sm font-bold text-slate-700 z-10 bg-white/90 px-4 py-1.5 rounded-full shadow-sm">
                      {nuevaPromo.filePreview ? "Cambiar Imagen" : "Elegir Imagen (PNG/JPG)"}
                    </span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFilePromo} />
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={subiendoPromo}
                  className="w-full bg-[#00c3ff] hover:bg-[#00a6da] text-white font-bold py-2.5 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-70 cursor-pointer"
                >
                  {subiendoPromo ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</> : "Publicar Ahora"}
                </button>
              </form>

              {/* Lista de promociones activas */}
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-3">Avisos Activos en el App</h4>
                {loadingPromos ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-[#00c3ff]"/></div>
                ) : promociones.length > 0 ? (
                  <div className="space-y-3">
                    {promociones.map(promo => (
                      <div key={promo.id} className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img src={promo.imagen_url_firmada || promo.imagen_url} alt={promo.titulo} className="w-10 h-10 object-cover rounded-lg border border-slate-100" />
                          <p className="font-semibold text-sm text-slate-700 truncate pr-2">{promo.titulo}</p>
                        </div>
                        <button 
                          onClick={() => eliminarPromo(promo.id)}
                          className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                          title="Eliminar este aviso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">No hay promociones activas.</p>
                )}
              </div>
              
            </div>
          </div>
        </div>
      )}

    </div>
  );
}