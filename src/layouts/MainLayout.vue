<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router    = useRouter()
const authStore = useAuthStore()

// Definición del menú lateral
// soloAdmin: true significa que ese ítem solo aparece habilitado para el rol ADMIN
const todosLosMenus = [
    { ruta: '/titulares',      nombre: 'Titulares',         icono: 'pi pi-users'        },
    { ruta: '/contratos',      nombre: 'Contratos',         icono: 'pi pi-file'         },
    { ruta: '/recibos',        nombre: 'Recibos',           icono: 'pi pi-receipt'      },
    { ruta: '/pagos',          nombre: 'Pagos',             icono: 'pi pi-wallet'       },
    { ruta: '/tramites',       nombre: 'Trámites',          icono: 'pi pi-clipboard'    },
    { ruta: '/descuentos',     nombre: 'Descuentos',        icono: 'pi pi-tag',         rolesPermitidos: ['ADMIN', 'DIRECTOR'] },
    { ruta: '/reportes',       nombre: 'Reportes',          icono: 'pi pi-chart-bar'    },
    { ruta: '/control-acceso', nombre: 'Control de Acceso', icono: 'pi pi-shield',      soloAdmin: true },
]

const menus = computed(() =>
    todosLosMenus.map(m => ({
        ...m,
        permitido: m.soloAdmin
            ? authStore.esAdmin
            : m.rolesPermitidos
                ? m.rolesPermitidos.includes(authStore.rol)
                : true
    }))
)

function cerrarSesion() {
    authStore.logout()
    router.push('/login')
}
</script>

<template>
    <Toast />
    <ConfirmDialog />
    <div class="layout">

        <!-- Menú lateral -->
        <aside class="sidebar">
            <div class="sidebar-logo">
                <span class="logo-texto">SIGAT</span>
            </div>

            <nav class="sidebar-nav">
                <template v-for="m in menus" :key="m.ruta">
                    <!-- Permitido: enlace activo -->
                    <RouterLink v-if="m.permitido" :to="m.ruta" class="nav-item">
                        <i :class="m.icono"></i>
                        <span>{{ m.nombre }}</span>
                    </RouterLink>
                    <!-- Sin permiso: apariencia deshabilitada, sin navegación -->
                    <span v-else class="nav-item nav-item--disabled" :title="`Sin acceso a ${m.nombre}`">
                        <i :class="m.icono"></i>
                        <span>{{ m.nombre }}</span>
                        <i class="pi pi-lock nav-lock"></i>
                    </span>
                </template>
            </nav>
        </aside>

        <!-- Contenido derecho -->
        <div class="main">
            <header class="topbar">
                <div class="topbar-titulo">
                    Sistema de Gestión de Agua Potable
                </div>
                <div class="topbar-acciones">
                    <span class="topbar-usuario">{{ authStore.username }}</span>
                    <Button label="Cerrar sesión" icon="pi pi-sign-out" severity="secondary" text @click="cerrarSesion" />
                </div>
            </header>

            <main class="contenido">
                <RouterView />
            </main>
        </div>
    </div>
</template>

<style scoped>
.layout {
    display: flex;
    min-height: 100vh;
}

/* ── Sidebar ── */
.sidebar {
    width: 185px;
    background-color: #1a5276;
    color: white;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
}

.sidebar-logo {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.logo-texto {
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: white;
}

.sidebar-nav {
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    color: rgba(255,255,255,0.75);
    text-decoration: none;
    transition: background 0.2s, color 0.2s;
    font-size: 0.9rem;
    position: relative;
}

.nav-item:hover {
    background-color: rgba(255,255,255,0.1);
    color: white;
}

.nav-item.router-link-active {
    background-color: rgba(255,255,255,0.15);
    color: white;
    font-weight: 600;
}

.nav-item--disabled {
    cursor: not-allowed;
    color: rgba(255,255,255,0.3);
    user-select: none;
}

.nav-item--disabled:hover {
    background: none;
    color: rgba(255,255,255,0.3);
}

.nav-lock {
    font-size: 0.65rem;
    margin-left: auto;
    opacity: 0.6;
}

/* ── Main ── */
.main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #f0f2f5;
    overflow: hidden;
}

.topbar {
    background: white;
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.topbar-titulo {
    font-weight: 600;
    color: #374151;
}

.topbar-acciones {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.topbar-usuario {
    font-size: 0.875rem;
    color: #6b7280;
}

.contenido {
    padding: 1.5rem;
    flex: 1;
    overflow-y: auto;
}
</style>
