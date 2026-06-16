import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore }  from '../stores/auth'
import LoginView         from '../views/LoginView.vue'
import MainLayout        from '../layouts/MainLayout.vue'
import TitularesView     from '../views/TitularesView.vue'
import ContratosView     from '../views/ContratosView.vue'
import RecibosView       from '../views/RecibosView.vue'
import PagosView         from '../views/PagosView.vue'
import TramitesView      from '../views/TramitesView.vue'
import DescuentosView    from '../views/DescuentosView.vue'
import CatalogosView     from '../views/CatalogosView.vue'
import ReportesView      from '../views/ReportesView.vue'
import ControlAccesoView from '../views/ControlAccesoView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', redirect: '/login' },
        {
            path: '/login',
            name: 'login',
            component: LoginView,
            meta: { publica: true }
        },
        {
            path: '/',
            component: MainLayout,
            children: [
                { path: 'titulares',      name: 'titulares',      component: TitularesView },
                { path: 'contratos',      name: 'contratos',      component: ContratosView },
                { path: 'recibos',        name: 'recibos',        component: RecibosView },
                { path: 'pagos',          name: 'pagos',          component: PagosView },
                { path: 'tramites',       name: 'tramites',       component: TramitesView },
                {
                    path: 'descuentos',
                    name: 'descuentos',
                    component: DescuentosView,
                    meta: { rolesPermitidos: ['ADMIN', 'DIRECTOR'] }
                },
                { path: 'reportes',       name: 'reportes',       component: ReportesView },
                {
                    path: 'catalogos',
                    name: 'catalogos',
                    component: CatalogosView,
                    meta: { rolesPermitidos: ['ADMIN', 'DIRECTOR'] }
                },
                {
                    // Solo ADMIN puede acceder a control de acceso
                    path: 'control-acceso',
                    name: 'control-acceso',
                    component: ControlAccesoView,
                    meta: { soloAdmin: true }
                }
            ]
        }
    ]
})

// Guard de navegación: se ejecuta antes de cada cambio de ruta
// Usa el store de Pinia (memoria de esta pestaña) en lugar de localStorage,
// para que dos pestañas con usuarios distintos no se interfieran entre sí.
router.beforeEach((to) => {
    const auth = useAuthStore()

    // Si la ruta es pública (login)
    if (to.meta.publica) {
        if (auth.estaLogueado) return { name: 'titulares' }
        return true
    }

    // Si no hay token, mandar al login
    if (!auth.estaLogueado) return { name: 'login' }

    // Si la ruta es solo para admin y el usuario no lo es
    if (to.meta.soloAdmin && !auth.esAdmin) {
        return { name: 'titulares' }
    }

    // Si la ruta tiene roles permitidos y el usuario no está en la lista
    if (to.meta.rolesPermitidos && !to.meta.rolesPermitidos.includes(auth.rol)) {
        return { name: 'titulares' }
    }

    return true
})

export default router
