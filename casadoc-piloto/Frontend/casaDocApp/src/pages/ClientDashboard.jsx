import { useState, useEffect } from "react";
import { LogOut, Plus, ChevronRight, ChevronLeft, Calendar, X, Dog, Upload, Loader2, Edit3, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { peticionSegura, getStoredValue } from "../api";
import { toast } from "sonner";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [ownerName, setOwnerName] = useState("Cliente");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mascotaEditando, setMascotaEditando] = useState(null);

  const [modalLegal, setModalLegal] = useState({ isOpen: false, tipo: null });
  
  const [modalPromociones, setModalPromociones] = useState(false);
  const [promociones, setPromociones] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [nuevaMascota, setNuevaMascota] = useState({
    nombre: "",
    especie: "Perro",
    raza: "",
    fecha_nacimiento: "",
    peso: "",
    fotoFile: null,
    fotoPreview: "" 
  });

  const [mascotas, setMascotas] = useState([]);
  const [totalMascotas, setTotalMascotas] = useState(0);

  const fetchMascotas = async () => {
    setIsLoading(true);
    try {
      let url = `/api/mascotas/?page=${currentPage}`;
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }

      const response = await peticionSegura(url);

      if (response.ok) {
        const data = await response.json();
        setMascotas(data.results || data);
        setTotalMascotas(data.count !== undefined ? data.count : (data.results ? data.results.length : data.length));
        setHasNext(!!data.next);
        setHasPrev(!!data.previous);
      } else if (response.status === 401) {
        localStorage.clear();
        sessionStorage.clear(); 
        navigate("/login");
      }
    } catch (err) {
      console.error("Error al conectar con el servidor", err);
      toast.error("Error al sincronizar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const abrirPromociones = async () => {
    setModalPromociones(true);
    setLoadingPromos(true);
    try {
      const res = await peticionSegura('/api/promociones/');
      if (res.ok) {
        const data = await res.json();
        setPromociones(data.results || data);
      } else {
        toast.error("No se pudieron cargar los avisos.");
      }
    } catch (e) {
      toast.error("Error de conexión al cargar promociones.");
    } finally {
      setLoadingPromos(false);
    }
  };

  useEffect(() => {
    const storedName = getStoredValue("user_name");
    if (storedName) setOwnerName(storedName);

    const delayDebounceFn = setTimeout(() => {
      fetchMascotas();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [navigate, currentPage, searchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); 
  };

  const totalDocumentos = mascotas.reduce((acc, pet) => acc + (pet.documentos_count || 0), 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevaMascota(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
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
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);

        setNuevaMascota(prev => ({ 
          ...prev, 
          fotoFile: file, 
          fotoPreview: compressedDataUrl 
        }));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    try {
      await peticionSegura("/api/auth/logout/", { method: "POST" });
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Sesión cerrada correctamente.");
      navigate("/login");
    }
  };

  const abrirEdicion = (mascota, e) => {
    e.stopPropagation(); 
    setMascotaEditando(mascota);
    setNuevaMascota({
      nombre: mascota.nombre,
      especie: mascota.especie,
      raza: mascota.raza,
      fecha_nacimiento: mascota.fecha_nacimiento || "",
      peso: mascota.peso,
      fotoFile: null,
      fotoPreview: mascota.imagen_url || mascota.imagen || ""
    });
    setIsModalOpen(true);
  };
  
  const cerrarModal = () => {
    setIsModalOpen(false);
    setMascotaEditando(null);
    setNuevaMascota({ nombre: "", especie: "Perro", raza: "", fecha_nacimiento: "", peso: "", fotoFile: null, fotoPreview: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const tieneEdadValida = nuevaMascota.fecha_nacimiento || (mascotaEditando && mascotaEditando.edad);
    if (!nuevaMascota.nombre || !nuevaMascota.raza || !tieneEdadValida || !nuevaMascota.peso) {
      toast.error("Por favor, rellena todos los campos obligatorios.");
      return;
    }
  
    setIsSubmitting(true);
  
    const fotoPorDefecto = nuevaMascota.especie === "Perro" 
      ? "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&auto=format&fit=crop&q=60"
      : "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=150&auto=format&fit=crop&q=60";
  
    const payload = {
      nombre: nuevaMascota.nombre,
      especie: nuevaMascota.especie,
      raza: nuevaMascota.raza,
      peso: parseFloat(nuevaMascota.peso),
    };
  
    if (nuevaMascota.fecha_nacimiento) {
      payload.fecha_nacimiento = nuevaMascota.fecha_nacimiento;
    }
  
    if (nuevaMascota.fotoFile) {
      payload.imagen = nuevaMascota.fotoPreview;
    } else if (!mascotaEditando) {
      payload.imagen = fotoPorDefecto;
    }
  
    const url = mascotaEditando ? `/api/mascotas/${mascotaEditando.id}/` : "/api/mascotas/";
    const method = mascotaEditando ? "PATCH" : "POST";
  
    try {
      const response = await peticionSegura(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (response.ok) {
        toast.success(mascotaEditando ? "¡Mascota actualizada!" : "¡Mascota registrada con éxito!");
        cerrarModal();
        if (currentPage === 1 && searchTerm === "") {
          fetchMascotas();
        } else {
          setCurrentPage(1);
          setSearchTerm("");
        }
      } else {
        const errorData = await response.json();
        toast.error("Error: " + (errorData.detail || JSON.stringify(errorData)));
      }
    } catch (error) {
      toast.error("Error de conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] flex flex-col md:flex-row font-sans">
      
      <div className="bg-[#00c3ff] w-full md:w-80 lg:w-96 p-6 rounded-b-[2rem] md:rounded-b-none md:rounded-r-[2.5rem] text-white shadow-md md:shadow-xl flex flex-col justify-between md:min-h-screen md:sticky md:top-0 md:z-10 flex-shrink-0">
        <div>
          <div className="mb-6 md:mb-10">
            <div className="flex items-center gap-3 mb-2">
              <img 
                src="/logoCasadoc.png" 
                alt="Logo CasaDoc" 
                className="w-14 h-14 object-contain bg-white p-2 rounded-2xl shadow-md" 
              />
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-md">CasaDoc</span>
            </div>
            <h1 className="text-lg font-light tracking-tight text-cyan-50">Medicina Veterinaria</h1>
          </div>

          <div className="flex justify-between items-start mb-8">
            <div className="w-full pr-2">
              <span className="text-cyan-100 text-xs font-medium tracking-wide opacity-80">Bienvenida</span>
              <h2 className="text-2xl font-bold tracking-tight mt-0.5 break-words">{ownerName}</h2>
            </div>
            <div className="flex gap-2.5 flex-shrink-0">
              <button 
                onClick={handleLogout}
                className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-all cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* --- BLOQUE DE ESTADÍSTICAS MODIFICADO PARA MÓVIL --- */}
          <div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-4 pt-2">
              <div className="bg-white/15 rounded-2xl p-3.5 md:p-4 text-center md:text-left flex flex-col md:flex-row md:items-center md:gap-4 justify-center md:justify-start hover:bg-white/20 transition-colors">
                <span className="text-2xl md:text-3xl font-bold leading-none">{totalMascotas}</span>
                <span className="text-[11px] md:text-sm text-cyan-50 font-medium mt-0.5 md:mt-0 opacity-90">Mascotas registradas</span>
              </div>
              <div className="bg-white/15 rounded-2xl p-3.5 md:p-4 text-center md:text-left flex flex-col md:flex-row md:items-center md:gap-4 justify-center md:justify-start hover:bg-white/20 transition-colors">
                <span className="text-2xl md:text-3xl font-bold leading-none">{totalDocumentos}</span>
                <span className="text-[11px] md:text-sm text-cyan-50 font-medium mt-0.5 md:mt-0 opacity-90">Documentos médicos</span>
              </div>
            </div>
            
            {/* --- BOTÓN DE AVISOS Y PROMOCIONES --- */}
            {/* Se bajó de la grid para que tome el 100% de ancho en móvil y no se aplaste */}
            <button 
              onClick={abrirPromociones} 
              className="mt-3 md:mt-4 bg-[#f8f9fa] hover:bg-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] rounded-full p-2 pr-4 flex items-center transition-all duration-300 cursor-pointer w-full group active:scale-95"
            >
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center flex-shrink-0 relative shadow-inner border border-slate-50">
                <Tag className="w-5 h-5 text-[#00c3ff] group-hover:scale-110 transition-transform" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse border-2 border-white" />
              </div>
              
              <div className="w-px h-7 bg-slate-200 mx-3 flex-shrink-0"></div>
              
              <div className="text-left pl-1 overflow-hidden">
                <span className="block text-[13px] md:text-[14px] font-bold text-slate-500 group-hover:text-[#00c3ff] transition-colors truncate">
                  Promociones
                </span>
                <span className="block text-[10px] md:text-[11px] text-slate-400 font-medium leading-none mt-1 truncate">
                  Ver avisos y ofertas
                </span>
              </div>
            </button>
          </div>

          <div className="mt-6 md:mt-8 pt-5 md:pt-6 border-t border-white/20 text-left">
            <p className="text-[10px] md:text-xs font-bold text-cyan-100 uppercase tracking-widest mb-3">Legal y Privacidad</p>
            <button 
              onClick={() => setModalLegal({isOpen: true, tipo: 'terminos'})} 
              className="block text-xs md:text-sm text-white hover:text-cyan-100 font-medium mb-2.5 transition-colors cursor-pointer text-left"
            >
              Términos y Condiciones
            </button>
            <button 
              onClick={() => setModalLegal({isOpen: true, tipo: 'privacidad'})} 
              className="block text-xs md:text-sm text-white hover:text-cyan-100 font-medium transition-colors cursor-pointer text-left"
            >
              Política de Tratamiento de Datos
            </button>
          </div>

        </div>
        
        <div className="hidden md:block pt-6 border-t border-white/10 text-xs text-cyan-100/60 font-medium">
          © {new Date().getFullYear()} CasaDoc App.
        </div>
      </div>

      <div className="p-6 md:p-10 lg:p-12 flex-1 max-w-4xl mx-auto w-full">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Mis mascotas</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Selecciona una de tus mascotas para revisar su historial médico.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input 
              type="text"
              placeholder="Buscar por nombre o raza..."
              value={searchTerm}
              onChange={handleSearchChange} 
              className="flex-1 sm:w-60 bg-white border border-slate-200 text-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm font-medium focus:outline-hidden focus:border-[#00c3ff] transition-all shadow-2xs"
            />
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-2.5 md:p-3 bg-[#00c3ff] hover:bg-[#00a6da] active:scale-95 rounded-full text-white transition-all shadow-md cursor-pointer flex items-center gap-2 group flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span className="max-w-0 overflow-hidden group-hover:max-w-24 transition-all duration-300 ease-out text-sm font-semibold whitespace-nowrap">Añadir</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-[#00c3ff] mb-4" />
            <p className="text-slate-400 font-medium text-sm">Cargando tus mascotas...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {mascotas.length > 0 ? (
              mascotas.map((mascota) => (
                <div 
                  key={mascota.id} 
                  onClick={() => navigate(`/mascota?id=${mascota.id}`)}
                  className="bg-white rounded-3xl p-4 sm:p-5 flex gap-4 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)] border border-slate-100/80 relative group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer w-full"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-inner flex items-center justify-center">
                    {(mascota.imagen_url || mascota.imagen) ? (
                      <img 
                        src={mascota.imagen_url || mascota.imagen} 
                        alt={mascota.nombre} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Dog className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 pr-6">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-lg md:text-xl text-slate-800 truncate">{mascota.nombre}</h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0 z-10">
                          <span className={`text-[10px] md:text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            mascota.especie === "Perro" 
                              ? "bg-orange-50 text-orange-600/90" 
                              : "bg-cyan-50 text-[#00c3ff]"
                          }`}>
                            {mascota.especie}
                          </span>
                          <button
                            onClick={(e) => abrirEdicion(mascota, e)}
                            className="p-1.5 text-slate-400 hover:text-[#00c3ff] hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar mascota"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 font-medium -mt-0.5">{mascota.raza}</p>
                    </div>

                    <div className="flex gap-4 text-xs font-bold text-slate-700 my-1">
                      <span>{mascota.edad} años</span>
                      <span>{mascota.peso} kg</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-semibold mt-1">
                      {mascota.fecha_ultima_visita ? (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">{mascota.fecha_ultima_visita}</span>
                        </div>
                      ) : (
                        <div />
                      )}
                      <span className="text-[#00c3ff] font-bold md:bg-cyan-50/50 md:px-2 md:py-0.5 md:rounded-lg transition-colors flex-shrink-0 ml-auto">
                        {mascota.documentos_count || 0} docs
                      </span>
                    </div>
                  </div>

                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-[#00c3ff] group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-slate-400 font-medium bg-white rounded-3xl border border-dashed border-slate-200">
                No encontramos ninguna mascota que coincida con tu búsqueda. ¡Agrega una nueva!
              </div>
            )}

            {(hasPrev || hasNext) && (
              <div className="flex items-center justify-between mt-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <button
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={!hasPrev}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Página {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!hasNext}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-[#00c3ff] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-50 rounded-xl transition-colors cursor-pointer"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            
            <button 
              onClick={cerrarModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Dog className="w-5 h-5 text-[#00c3ff]" />
                {mascotaEditando ? "Editar Mascota" : "Registrar Nueva Mascota"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Ingresa los datos primordiales de tu compañero de cuatro patas.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre de la Mascota *</label>
                <input 
                  type="text" 
                  name="nombre"
                  placeholder="Ej: Rocco, Mia"
                  value={nuevaMascota.nombre}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Especie</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Perro", "Gato"].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setNuevaMascota(prev => ({ ...prev, especie: e }))}
                      className={`py-2.5 text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                        nuevaMascota.especie === e 
                          ? "bg-cyan-50 text-[#00c3ff] border-[#00c3ff]" 
                          : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Raza *</label>
                <input 
                  type="text" 
                  name="raza"
                  placeholder="Ej: Criollo, Poodle, Siamés"
                  value={nuevaMascota.raza}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Fecha de Nacimiento *</label>
                  <input 
                    type="date" 
                    name="fecha_nacimiento"
                    max={new Date().toISOString().split('T')[0]}
                    value={nuevaMascota.fecha_nacimiento}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all"
                  />
                  {nuevaMascota.fecha_nacimiento && (
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                      → {(() => {
                        const n = new Date(nuevaMascota.fecha_nacimiento), h = new Date();
                        let a = h.getFullYear() - n.getFullYear();
                        if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
                        return Math.max(a, 0);
                      })()} años
                    </p>
                  )}
                  {mascotaEditando && !nuevaMascota.fecha_nacimiento && (
                    <p className="text-[11px] text-amber-500 mt-1 font-medium">
                      Esta mascota no tiene fecha de nacimiento registrada (edad actual: {mascotaEditando.edad} años).
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Peso (Kg) *</label>
                  <input 
                    type="number" 
                    name="peso"
                    step="0.1"
                    placeholder="Ej: 8.5"
                    min="0"
                    value={nuevaMascota.peso}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Foto de la Mascota</label>
                <label className="w-full border-2 border-dashed border-slate-200 hover:border-[#00c3ff] bg-slate-50/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group relative overflow-hidden min-h-[85px]">
                  {nuevaMascota.fotoPreview ? (
                    <div className="flex items-center gap-3 w-full px-2">
                      <img src={nuevaMascota.fotoPreview} alt="Previsualización" className="w-12 h-12 object-cover rounded-xl border border-slate-200" />
                      <span className="text-xs font-bold text-slate-700 truncate flex-1">¡Imagen lista! Cambiar...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-[#00c3ff] transition-colors" />
                      <span className="text-xs font-semibold text-slate-600">Haz clic para examinar archivo</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    className="hidden" 
                    accept="image/*" 
                  />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={cerrarModal}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#00c3ff] hover:bg-[#00a6da] text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  ) : (
                    mascotaEditando ? "Guardar Cambios" : "Registrar"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE AVISOS Y PROMOCIONES --- */}
      {modalPromociones && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Avisos y Promociones</h3>
              <button 
                onClick={() => setModalPromociones(false)}
                className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer text-3xl leading-none"
              >&times;</button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-5 flex-1">
              {loadingPromos ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00c3ff]" />
                </div>
              ) : promociones.length > 0 ? (
                promociones.map((promo) => (
                  <div key={promo.id} className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                    <img 
                      src={promo.imagen_url_firmada || promo.imagen_url} 
                      alt={promo.titulo} 
                      className="w-full h-auto object-cover max-h-64"
                    />
                    <div className="p-3 bg-white border-t border-slate-100">
                      <p className="font-bold text-slate-700 text-sm">{promo.titulo}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 py-10 text-sm">No hay promociones activas en este momento.</p>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setModalPromociones(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold transition-all cursor-pointer shadow-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL LEGAL --- */}
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
            
            <div className="overflow-y-auto pr-4 text-sm text-slate-600 space-y-4 text-left">
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