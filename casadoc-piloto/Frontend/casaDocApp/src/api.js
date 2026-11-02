// Recuperamos la variable de entorno para producción, con respaldo a local
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"; 

// Limpiamos la URL base por seguridad (quita el '/' final si alguien lo pone por error en el .env)
const cleanBaseUrl = BACKEND_URL.replace(/\/$/, "");

export const getStoredValue = (key) => {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
};

export const peticionSegura = async (endpoint, options = {}) => {
    let accessToken = getStoredValue("access_token");

    let headers = {
        "Content-Type": "application/json",
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...options.headers,
    };

    // Previene errores de formato si en el futuro envías archivos con FormData
    if (options.body instanceof FormData) {
        delete headers["Content-Type"];
    }

    // Concatenamos de forma segura garantizando una sola barra '/'
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const fullUrl = `${cleanBaseUrl}${cleanEndpoint}`;
    

    let response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: "include",
    });

    // ✅ FLUJO DE REFRESH: Si el access token venció (401), intentamos refrescarlo
    if (response.status === 401) {
        console.log("Token expirado o inválido. Intentando refrescar sesión...");
        
        try {
            // Usamos cleanBaseUrl para evitar duplicar rutas
            const refreshResponse = await fetch(`${cleanBaseUrl}/api/auth/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                
                // Guardamos el nuevo access token
                localStorage.setItem("access_token", data.access);
                
                // Actualizamos el header de la petición original con el nuevo token
                headers["Authorization"] = `Bearer ${data.access}`;
                
                console.log("Sesión refrescada con éxito. Reintentando petición...");
                
                // Reintentamos la petición original de forma invisible para el usuario
                response = await fetch(fullUrl, {
                    ...options,
                    headers,
                    credentials: "include",
                });
            } else {
                // Si el refresh falla (la cookie expiró, fue borrada o está en blacklist)
                console.error("La sesión ha expirado completamente. Redirigiendo al login...");
                localStorage.removeItem("access_token");
                sessionStorage.removeItem("access_token");
                window.location.href = '/login'; 
            }
        } catch (error) {
            console.error("Error de red al intentar refrescar el token:", error);
            localStorage.removeItem("access_token");
            sessionStorage.removeItem("access_token");
            window.location.href = '/login';
        }
    }

    return response;
};