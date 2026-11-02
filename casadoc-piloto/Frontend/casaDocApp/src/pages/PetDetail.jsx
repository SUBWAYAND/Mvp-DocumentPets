import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, Download, Printer, Calendar, ShieldAlert, Filter, Search, X, Loader2, Save, Trash2, Edit3, Upload } from "lucide-react";
import { peticionSegura, getStoredValue } from "../api";

export default function PetDetail() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const mascotaId = queryParams.get("id");

  const [pet, setPet] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filtroActivo, setFiltroActivo] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  
  // Estado para almacenar temporalmente el enlace seguro de R2
  const [secureFileUrl, setSecureFileUrl] = useState(null); 
  
  const [descripcionEditable, setDescripcionEditable] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editTipo, setEditTipo] = useState("");
  const [editArchivoBase64, setEditArchivoBase64] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const userRole = getStoredValue("user_role");
  const isVeterinario = userRole === "veterinario";

  const fetchDetalleData = async () => {
    try {
      // 🔴 ARREGLO CRÍTICO: Buscar SOLO la mascota por su ID en lugar de la lista paginada
      const resMascota = await peticionSegura(`/api/mascotas/${mascotaId}/`);

      if (resMascota.ok) {
        const data = await resMascota.json();
        setPet(data);
      } else {
        // Si la mascota no existe o no hay permisos, lo regresamos al panel
        navigate(isVeterinario ? "/veterinario" : "/dashboard");
        return; 
      }

      // Buscar los documentos asociados a la mascota
      const resDocs = await peticionSegura(`/api/documentos/?mascota_id=${mascotaId}`);

      if (resDocs.ok) {
        const docsData = await resDocs.json();
        setHistorial(docsData.results || docsData);
      }

    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!mascotaId) {
      navigate(isVeterinario ? "/veterinario" : "/dashboard");
      return;
    }

    const token = getStoredValue("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchDetalleData();
  }, [mascotaId, navigate, isVeterinario]);

  // Al abrir el documento, pedimos la URL firmada para poder visualizarlo
  const abrirModalDocumento = async (doc) => {
    setDocumentoSeleccionado(doc);
    setDescripcionEditable(doc.descripcion || "");
    setIsEditingDoc(false);
    setEditTipo(doc.tipo || "Fórmula Médica");
    setEditArchivoBase64("");
    setSecureFileUrl(null); // Reiniciamos el visor

    try {
      const res = await peticionSegura(`/api/documentos/${doc.id}/`);
      if (res.ok) {
        const docCompleto = await res.json();
        setDocumentoSeleccionado(docCompleto);
        setDescripcionEditable(docCompleto.descripcion || "");
        setEditTipo(docCompleto.tipo || "Fórmula Médica");

        // Buscar el pase temporal (URL Firmada)
        if (docCompleto.archivo_url) {
          // Si por alguna razón la BD aún tiene guardada una URL completa/Base64, úsala directo (Migración suave)
          if (docCompleto.archivo_url.startsWith('http') || docCompleto.archivo_url.startsWith('data:')) {
            setSecureFileUrl(docCompleto.archivo_url);
          } else {
            // Flujo Seguro: Pedir firma temporal de 5 minutos al backend
            const urlRes = await peticionSegura(`/api/documentos/${docCompleto.id}/descargar/`);
            if (urlRes.ok) {
              const urlData = await urlRes.json();
              setSecureFileUrl(urlData.url);
            } else {
              console.error("No se pudo obtener el enlace seguro.");
            }
          }
        }
      }
    } catch (err) {
      console.error("Error al obtener el detalle completo del documento", err);
    }
  };

  const handleGuardarCambios = async () => {
    if (!isVeterinario || !documentoSeleccionado) return;
    
    setIsSaving(true);

    try {
      const response = await peticionSegura(`/api/documentos/${documentoSeleccionado.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ descripcion: descripcionEditable }),
      });

      if (response.ok) {
        const actualizado = await response.json();
        setHistorial(prev => prev.map(d => d.id === actualizado.id ? actualizado : d));
        setDocumentoSeleccionado(actualizado);
        alert("¡Detalles y recordatorios actualizados con éxito!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error al guardar (${response.status}): ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error("Error de red", error);
      alert("Error de conexión con el backend.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleActualizarDocumentoCompleto = async (e) => {
    e.preventDefault();
    if (!isVeterinario || !documentoSeleccionado) return;

    setIsSaving(true);

    const payload = {
      tipo: editTipo,
      titulo: editTipo,
      ...(editArchivoBase64 && { archivo_url: editArchivoBase64 })
    };

    try {
      const response = await peticionSegura(`/api/documentos/${documentoSeleccionado.id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const actualizado = await response.json();
        setHistorial(prev => prev.map(d => d.id === actualizado.id ? actualizado : d));
        setDocumentoSeleccionado(actualizado);
        setIsEditingDoc(false);
        setEditArchivoBase64("");

        // Refrescar el enlace seguro en caso de que se haya subido un nuevo archivo
        if (actualizado.archivo_url) {
          if (!actualizado.archivo_url.startsWith('http') && !actualizado.archivo_url.startsWith('data:')) {
            const urlRes = await peticionSegura(`/api/documentos/${actualizado.id}/descargar/`);
            if (urlRes.ok) {
              const urlData = await urlRes.json();
              setSecureFileUrl(urlData.url);
            }
          } else {
            setSecureFileUrl(actualizado.archivo_url);
          }
        } else {
          setSecureFileUrl(null);
        }

        alert("¡Documento clínico actualizado correctamente!");
      } else {
        const errData = await response.json();
        alert(errData.error || "Error al actualizar el documento.");
      }
    } catch (error) {
      console.error("Error al actualizar", error);
      alert("Error de conexión con el servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarDocumento = async () => {
    if (!isVeterinario || !documentoSeleccionado) return;

    if (!window.confirm("¿Estás completamente seguro de eliminar este registro médico? Esta acción es irreversible.")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await peticionSegura(`/api/documentos/${documentoSeleccionado.id}/`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Registro médico eliminado con éxito.");
        setHistorial(prev => prev.filter(d => d.id !== documentoSeleccionado.id));
        setDocumentoSeleccionado(null);
      } else {
        alert("No tienes permisos o ocurrió un error al intentar eliminar el documento.");
      }
    } catch (error) {
      console.error("Error de red al eliminar", error);
      alert("Error de conexión con el backend.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditArchivoBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const normalizar = (texto) => {
    return (texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const documentosFiltrados = historial.filter((doc) => {
    const tipoNorm = normalizar(doc.tipo);
    const tituloNorm = normalizar(doc.titulo);
    const filtroNorm = normalizar(filtroActivo);

    const coincideFiltro = 
      filtroActivo === "Todos" || 
      tipoNorm.includes(filtroNorm) ||
      tituloNorm.includes(filtroNorm);

    const busquedaNorm = normalizar(searchQuery);
    const coincideBusqueda = 
      tituloNorm.includes(busquedaNorm) ||
      tipoNorm.includes(busquedaNorm) ||
      normalizar(doc.medico).includes(busquedaNorm);

    return coincideFiltro && coincideBusqueda;
  });

  const tiposDisponibles = [
    "Todos", 
    "Fórmula Médica", 
    "Radiografía", 
    "Exámenes de Laboratorio", 
    "Ecografías", 
    "Certificados"
  ];

  const obtenerExtension = (archivo_url) => {
    if (!archivo_url) return 'pdf';
    // Ahora verificamos con string seguro, soportando mayúsculas/minúsculas
    const strLower = String(archivo_url).toLowerCase();
    if (strLower.includes('image/jpeg') || strLower.includes('.jpg') || strLower.includes('.jpeg')) return 'jpg';
    if (strLower.includes('image/png') || strLower.includes('.png')) return 'png';
    if (strLower.includes('image/webp') || strLower.includes('.webp')) return 'webp';
    return 'pdf'; 
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f5ee] flex flex-col justify-center items-center font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-[#00c3ff] mb-3" />
        <p className="text-slate-400 font-medium text-sm">Cargando historial clínico de la mascota...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5ee] font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Botón de regreso dinámico */}
        <Link to={isVeterinario ? "/veterinario" : "/dashboard"} className="inline-flex items-center gap-2 text-slate-500 hover:text-[#00c3ff] font-bold text-sm mb-6 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {isVeterinario ? "Volver al panel médico" : "Volver a mis mascotas"}
        </Link>

        {/* FICHA RESUMEN DE LA MASCOTA RESPONSIVA */}
        {pet && (
          <div className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col sm:flex-row items-center gap-5 mb-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-cyan-50 border border-cyan-100 overflow-hidden flex items-center justify-center text-[#00c3ff] text-3xl md:text-4xl font-black shadow-inner flex-shrink-0">
              {/* Leemos imagen_url prioritariamente para asegurarnos que soporte las URL firmadas */}
              {pet.imagen_url || pet.imagen ? (
                <img src={pet.imagen_url || pet.imagen} alt={pet.nombre} className="w-full h-full object-cover" />
              ) : (
                pet.nombre[0]
              )}
            </div>
            <div className="flex-1 text-center sm:text-left w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 justify-center sm:justify-start">
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 break-words">{pet.nombre}</h1>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full w-max mx-auto sm:mx-0">
                  Paciente Registrado
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-6 pt-1 text-xs md:text-sm font-medium text-slate-500">
                <div>Especie: <span className="text-slate-800 font-bold">{pet.especie}</span></div>
                <div>Raza: <span className="text-slate-800 font-bold">{pet.raza}</span></div>
                <div>Edad: <span className="text-slate-800 font-bold">{pet.edad} años</span></div>
                <div>Peso: <span className="text-slate-800 font-bold">{pet.peso} kg</span></div>
              </div>
            </div>
          </div>
        )}

        {/* BARRA DE BÚSQUEDA Y FILTROS INTERACTIVOS CON SCROLL HORIZONTAL */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] border border-slate-100 space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por vacuna, síntoma, palabra clave o médico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-hidden focus:border-[#00c3ff] focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1 flex-shrink-0">
              <Filter className="w-3.5 h-3.5 text-[#00c3ff]" /> Filtrar:
            </span>
            {tiposDisponibles.map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroActivo(tipo)}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex-shrink-0 ${
                  filtroActivo === tipo
                    ? "bg-[#00c3ff] text-white shadow-md scale-105"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-[#00c3ff] hover:text-[#00c3ff] hover:bg-cyan-50/30"
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        {/* LISTADO DE DOCUMENTOS MÉDICOS CLÍNICOS */}
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-2 px-1">Registros del Historial</h2>
          
          {documentosFiltrados.length > 0 ? (
            documentosFiltrados.map((doc) => (
              <div
                key={doc.id}
                onClick={() => abrirModalDocumento(doc)}
                className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 group-hover:bg-cyan-50 group-hover:text-[#00c3ff] transition-colors flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
                      {doc.tipo}
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm md:text-base mt-1 group-hover:text-[#00c3ff] transition-colors truncate">
                      {doc.titulo}
                    </h3>
                    <p className="text-[11px] md:text-xs text-slate-400 font-medium mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Médico: <strong className="text-slate-600">{doc.medico}</strong></span>
                      <span className="hidden sm:inline text-slate-200">|</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {doc.fecha}</span>
                    </p>
                  </div>
                </div>
                <div className="text-xs bg-slate-50 group-hover:bg-cyan-50 px-3 py-2 rounded-xl text-slate-500 group-hover:text-[#00c3ff] font-bold transition-all text-center sm:text-right flex-shrink-0">
                  Ver reporte
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center text-slate-400 font-medium">
              <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              No se encontraron registros médicos para esta mascota con los filtros aplicados.
            </div>
          )}
        </div>

      </div>

      {/* VENTANA MODAL: VISUALIZADOR INTERACTIVO ADAPTABLE */}
      {documentoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative border border-slate-100 max-h-[92vh] flex flex-col">
            
            {/* Encabezado */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 pr-14 relative flex-shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-[10px] bg-[#00c3ff] text-slate-900 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Visor Oficial DocumentPets
                </span>
                
                {isVeterinario && !isEditingDoc && (
                  <div className="flex items-center gap-2 mr-8">
                    <button
                      onClick={() => setIsEditingDoc(true)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={handleEliminarDocumento}
                      disabled={isDeleting}
                      className="text-xs bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Eliminar
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-lg sm:text-xl font-bold tracking-tight mt-1 break-words">{documentoSeleccionado.titulo}</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{documentoSeleccionado.tipo}</p>
              
              <button
                onClick={() => setDocumentoSeleccionado(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
                title="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo con Scroll */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-gradient-to-b from-white to-slate-50/50">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs font-semibold text-slate-500">
                <div>Paciente: <span className="text-slate-800 font-bold">{pet?.nombre} ({pet?.raza})</span></div>
                <div>Fecha de Emisión: <span className="text-slate-800 font-bold">{documentoSeleccionado.fecha}</span></div>
                <div className="sm:col-span-2">Médico Firmante: <span className="text-slate-800 font-bold">{documentoSeleccionado.medico}</span></div>
              </div>

              {isEditingDoc ? (
                <form onSubmit={handleActualizarDocumentoCompleto} className="bg-cyan-50/50 border border-cyan-100 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Editar Categoría y/o Reemplazar Archivo</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nueva Categoría</label>
                    <select
                      value={editTipo}
                      onChange={(e) => setEditTipo(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-[#00c3ff]"
                    >
                      {tiposDisponibles.filter(t => t !== "Todos").map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Reemplazar Archivo (Opcional - Máx 2MB)</label>
                    <label className="w-full border-2 border-dashed border-slate-300 hover:border-[#00c3ff] bg-white rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 truncate">
                        {editArchivoBase64 ? "¡Nuevo archivo seleccionado!" : "Seleccionar nuevo PDF o Imagen"}
                      </span>
                      <input type="file" onChange={handleEditFileChange} className="hidden" accept=".pdf, image/*" />
                    </label>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingDoc(false)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-[#00c3ff] hover:bg-[#00a6da] text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Guardar Cambios</span>
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Detalles y Recordatorios Adicionales
                  </label>
                  {isVeterinario && (
                    <button
                      onClick={handleGuardarCambios}
                      disabled={isSaving}
                      className="text-xs bg-[#00c3ff] hover:bg-[#00a6da] text-white font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Guardar Nota</span>
                    </button>
                  )}
                </div>
                
                <textarea
                  value={descripcionEditable}
                  onChange={(e) => isVeterinario && setDescripcionEditable(e.target.value)}
                  placeholder={isVeterinario ? "Escribe detalles, dosis o recordatorios adicionales aquí..." : "Sin notas o recordatorios adicionales registrados."}
                  rows="3"
                  readOnly={!isVeterinario}
                  className={`w-full border rounded-2xl p-3.5 text-xs sm:text-sm font-medium transition-all shadow-xs resize-y ${
                    isVeterinario 
                      ? "bg-white border-slate-200 text-slate-800 focus:outline-hidden focus:border-[#00c3ff]" 
                      : "bg-slate-50 border-slate-100 text-slate-600 cursor-default"
                  }`}
                />
              </div>

              {/* VISOR DE ARCHIVO ADJUNTO (AHORA SEGURO) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Documento Adjunto Oficial</h4>
                {secureFileUrl ? (
                  <div className="w-full min-h-[300px] sm:h-80 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
                    {/* Evaluamos si la clave original o la URL indican que es un PDF */}
                    {String(documentoSeleccionado.archivo_url).toLowerCase().includes("pdf") ? (
                      <iframe 
                        src={secureFileUrl} 
                        title="Previsualización PDF" 
                        className="w-full h-full min-h-[300px]"
                      />
                    ) : (
                      <img 
                        src={secureFileUrl} 
                        alt="Archivo adjunto" 
                        className="w-full h-full object-contain max-h-[350px]"
                      />
                    )}
                  </div>
                ) : documentoSeleccionado?.archivo_url ? (
                  /* Loading State mientras trae la llave firmada de R2 */
                  <div className="w-full min-h-[300px] sm:h-80 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-[#00c3ff] mb-3" />
                    <span className="text-xs font-medium">Desencriptando acceso temporal...</span>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium">
                    Este registro no cuenta con un archivo adjunto visualizable.
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col items-center text-center">
                <div className="font-serif italic text-slate-400 text-base sm:text-lg select-none tracking-widest opacity-60">
                  {documentoSeleccionado.medico}
                </div>
                <div className="w-28 sm:w-36 h-px bg-slate-200 my-1" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Firma Electrónica Autorizada</p>
              </div>
            </div>

            {/* Pie de Acciones */}
            <div className="bg-slate-50 border-t border-slate-100 p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-white hover:bg-slate-100 text-slate-600 font-bold py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Imprimir Documento
              </button>
              
              <a
                href={secureFileUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                download={`${documentoSeleccionado.titulo.replace(/\s+/g, '_')}.${obtenerExtension(documentoSeleccionado.archivo_url)}`}
                onClick={(e) => {
                  if (!secureFileUrl) {
                    e.preventDefault();
                    alert("El archivo aún no está listo o no tiene adjunto.");
                  }
                }}
                className="flex-1 bg-[#00c3ff] hover:bg-[#00a6da] text-white font-bold py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs no-underline text-center"
              >
                <Download className="w-4 h-4" /> 
                {String(documentoSeleccionado.archivo_url).toLowerCase().match(/\.(jpg|jpeg|png|webp)$/i) ? 'Descargar Imagen' : 'Descargar PDF'}
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}