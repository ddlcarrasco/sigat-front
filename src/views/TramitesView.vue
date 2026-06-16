<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useTramitesStore } from '../stores/tramites'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'

const store    = useTramitesStore()
const auth     = useAuthStore()
const toast    = useToast()

// ── Catálogos ─────────────────────────────────────────────────────────────
const contratos    = ref([])
const tiposTramite = ref([])

// ── Permisos basados en rol ───────────────────────────────────────────────
// El backend también valida esto; aquí solo es para mostrar/ocultar botones
const puedeVobo    = computed(() => ['ADMIN', 'DIRECTOR'].includes(auth.rol))
const puedeResolver= computed(() => ['ADMIN', 'TECNICO', 'OPERADOR'].includes(auth.rol))

// ── IDs de estado (según el backend) ─────────────────────────────────────
const PENDIENTE = 1
const VOBO      = 2
const RECHAZADO = 3
const RESUELTO  = 4

// ── Filtro ────────────────────────────────────────────────────────────────
const filtroEstado = ref(null)   // null = todos

const tramitesFiltrados = computed(() => {
    let lista = store.tramites
    if (filtroEstado.value !== null)
        lista = lista.filter(t => t.estadoTramiteId === filtroEstado.value)
    return lista
})

const filtros = [
    { label: 'Todos',          value: null      },
    { label: 'Pendientes',     value: PENDIENTE  },
    { label: 'VoBo aprobado',  value: VOBO       },
    { label: 'Resueltos',      value: RESUELTO   },
    { label: 'Rechazados',     value: RECHAZADO  }
]

// ── Tag de estado ─────────────────────────────────────────────────────────
const claseEstado = (id) => {
    if (id === PENDIENTE) return 'tag-pendiente'
    if (id === VOBO)      return 'tag-activo'
    if (id === RECHAZADO) return 'tag-cancelado'
    if (id === RESUELTO)  return 'tag-pagado'
    return ''
}

const formatFecha = (dt) => dt
    ? new Date(dt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

// ── Diálogo: Nuevo trámite ────────────────────────────────────────────────
const dialogNuevo = ref(false)
const creando     = ref(false)
const formNuevo   = ref({ contratoId: null, tipoTramiteId: null, datosPropuestos: '', observacionesSolicitud: '' })

function abrirNuevo() {
    formNuevo.value = { contratoId: null, tipoTramiteId: null, datosPropuestos: '', observacionesSolicitud: '' }
    dialogNuevo.value = true
}

async function crear() {
    if (!formNuevo.value.contratoId || !formNuevo.value.tipoTramiteId) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'Contrato y tipo de trámite son obligatorios', life: 3000 })
        return
    }
    creando.value = true
    try {
        await store.crear(formNuevo.value)
        toast.add({ severity: 'success', summary: 'Creado', detail: 'Trámite creado correctamente', life: 3000 })
        dialogNuevo.value = false
    } catch (e) {
        console.error(e)
        toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'No se pudo crear el trámite', life: 5000 })
    } finally {
        creando.value = false
    }
}

// ── Diálogo: VoBo ─────────────────────────────────────────────────────────
const dialogVobo    = ref(false)
const tramiteActivo = ref(null)
const guardandoVobo = ref(false)
const formVobo      = ref({ idEstadoNuevo: null, observaciones: '' })

function abrirVobo(tramite) {
    tramiteActivo.value = tramite
    formVobo.value = { idEstadoNuevo: null, observaciones: '' }
    dialogVobo.value = true
}

async function guardarVobo() {
    if (!formVobo.value.idEstadoNuevo) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'Selecciona aprobar o rechazar', life: 3000 })
        return
    }
    guardandoVobo.value = true
    try {
        await store.vobo(tramiteActivo.value.idtramite, formVobo.value)
        toast.add({ severity: 'success', summary: 'VoBo registrado', detail: 'VoBo aplicado correctamente', life: 3000 })
        dialogVobo.value = false
    } catch (e) {
        console.error(e)
        toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'No se pudo registrar el VoBo', life: 5000 })
    } finally {
        guardandoVobo.value = false
    }
}

// ── Diálogo: Resolver ─────────────────────────────────────────────────────
const dialogResolver    = ref(false)
const guardandoResolver = ref(false)
const formResolver      = ref({ idEstadoNuevo: null, observacionesResolucion: '' })

function abrirResolver(tramite) {
    tramiteActivo.value = tramite
    formResolver.value = { idEstadoNuevo: null, observacionesResolucion: '' }
    dialogResolver.value = true
}

async function guardarResolver() {
    if (!formResolver.value.idEstadoNuevo) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'Selecciona resolver o rechazar', life: 3000 })
        return
    }
    guardandoResolver.value = true
    try {
        await store.resolver(tramiteActivo.value.idtramite, formResolver.value)
        toast.add({ severity: 'success', summary: 'Resuelto', detail: 'Trámite actualizado correctamente', life: 3000 })
        dialogResolver.value = false
    } catch (e) {
        console.error(e)
        toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'No se pudo resolver el trámite', life: 5000 })
    } finally {
        guardandoResolver.value = false
    }
}

// ── Inicialización ────────────────────────────────────────────────────────
onMounted(async () => {
    const [, con, tip] = await Promise.allSettled([
        store.cargarTodos(),
        api.get('/contratos'),
        api.get('/tipos-tramite')
    ])
    if (con.status === 'fulfilled') contratos.value = con.value.data.data.map(c => ({
        ...c,
        etiqueta: `${c.numeroContrato} — ${c.titularNombre}`
    }))
    if (tip.status === 'fulfilled') tiposTramite.value = tip.value.data.data
})
</script>

<template>
    <div class="pagina-card">

        <!-- Encabezado -->
        <div class="pagina-card-header">
            <span class="pagina-card-titulo">Trámites</span>
            <Button label="Nuevo trámite" icon="pi pi-plus" size="small" @click="abrirNuevo" />
        </div>

        <!-- Filtros de estado -->
        <div class="barra-filtros">
            <button
                v-for="f in filtros" :key="f.value"
                class="filtro-btn"
                :class="{ activo: filtroEstado === f.value }"
                @click="filtroEstado = f.value"
            >
                {{ f.label }}
            </button>
        </div>

        <!-- Tabla -->
        <DataTable
            :value="tramitesFiltrados"
            :loading="store.cargando"
            paginator
            :rows="15"
            :rowsPerPageOptions="[10, 15, 25, 50]"
            scrollable
            scrollHeight="calc(100vh - 280px)"
            stripedRows
        >
            <template #empty>No se encontraron trámites.</template>

            <Column field="idtramite"        header="ID"        style="width: 70px" />
            <Column field="contratoNumero"   header="Contrato"  style="width: 130px" />
            <Column field="tipoTramiteNombre" header="Tipo" />
            <Column field="usuarioSolicitanteNombre" header="Solicitó" style="width: 160px" />

            <Column header="Estado" style="width: 140px">
                <template #body="{ data }">
                    <span :class="claseEstado(data.estadoTramiteId)">
                        {{ data.estadoTramiteNombre }}
                    </span>
                </template>
            </Column>

            <Column header="F. Solicitud" style="width: 110px">
                <template #body="{ data }">{{ formatFecha(data.fechaSolicitud) }}</template>
            </Column>

            <Column header="F. Resolución" style="width: 115px">
                <template #body="{ data }">{{ formatFecha(data.fechaResolucion) }}</template>
            </Column>

            <Column field="usuarioResolutorNombre" header="Resolvió" style="width: 150px">
                <template #body="{ data }">{{ data.usuarioResolutorNombre || '—' }}</template>
            </Column>

            <Column header="Acciones" style="width: 110px; text-align: center">
                <template #body="{ data }">
                    <!-- VoBo: solo cuando está Pendiente y el rol permite -->
                    <Button
                        v-if="data.estadoTramiteId === PENDIENTE && puedeVobo"
                        icon="pi pi-check-circle"
                        severity="secondary" text rounded size="small"
                        v-tooltip="'Dar VoBo'"
                        @click="abrirVobo(data)"
                    />
                    <!-- Resolver: cuando está Pendiente o VoBo aprobado y el rol permite -->
                    <Button
                        v-if="(data.estadoTramiteId === PENDIENTE || data.estadoTramiteId === VOBO) && puedeResolver"
                        icon="pi pi-wrench"
                        severity="secondary" text rounded size="small"
                        v-tooltip="'Resolver / Rechazar'"
                        @click="abrirResolver(data)"
                    />
                </template>
            </Column>
        </DataTable>
    </div>

    <!-- ── Diálogo: Nuevo trámite ── -->
    <Dialog v-model:visible="dialogNuevo" header="Nuevo trámite" :style="{ width: '520px' }" modal>
        <div class="form-grid">

            <div class="campo campo--full">
                <label>Contrato <span class="req">*</span></label>
                <Select
                    v-model="formNuevo.contratoId"
                    :options="contratos"
                    optionLabel="etiqueta"
                    optionValue="idcontrato"
                    placeholder="Busca por N° contrato o titular..."
                    filter
                    class="w-full"
                />
            </div>

            <div class="campo campo--full">
                <label>Tipo de trámite <span class="req">*</span></label>
                <Select
                    v-model="formNuevo.tipoTramiteId"
                    :options="tiposTramite"
                    optionLabel="nombre"
                    optionValue="idtipo_tramite"
                    placeholder="Selecciona..."
                    class="w-full"
                />
            </div>

            <div class="campo campo--full">
                <label>Datos propuestos</label>
                <Textarea v-model="formNuevo.datosPropuestos" rows="3"
                    placeholder="Describe los cambios o información relevante del trámite..." class="w-full" />
            </div>

            <div class="campo campo--full">
                <label>Observaciones de solicitud</label>
                <Textarea v-model="formNuevo.observacionesSolicitud" rows="2"
                    placeholder="Notas adicionales..." class="w-full" />
            </div>

        </div>
        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogNuevo = false" />
            <Button label="Crear trámite" icon="pi pi-check" :loading="creando" @click="crear" />
        </template>
    </Dialog>

    <!-- ── Diálogo: VoBo ── -->
    <Dialog v-model:visible="dialogVobo" header="Registro de VoBo" :style="{ width: '440px' }" modal>
        <div v-if="tramiteActivo" class="info-tramite">
            <span class="info-label">Trámite:</span>
            <span>{{ tramiteActivo.tipoTramiteNombre }} — {{ tramiteActivo.contratoNumero }}</span>
            <span class="info-label">Solicitó:</span>
            <span>{{ tramiteActivo.usuarioSolicitanteNombre }}</span>
            <span v-if="tramiteActivo.datosPropuestos" class="info-label">Datos:</span>
            <span v-if="tramiteActivo.datosPropuestos" class="info-datos">{{ tramiteActivo.datosPropuestos }}</span>
        </div>

        <div class="form-grid" style="margin-top: 1rem">
            <div class="campo campo--full">
                <label>Decisión <span class="req">*</span></label>
                <div class="decision-btns">
                    <button
                        class="decision-btn aprobar"
                        :class="{ seleccionado: formVobo.idEstadoNuevo === VOBO }"
                        @click="formVobo.idEstadoNuevo = VOBO"
                    >
                        <i class="pi pi-check"></i> Aprobar VoBo
                    </button>
                    <button
                        class="decision-btn rechazar"
                        :class="{ seleccionado: formVobo.idEstadoNuevo === RECHAZADO }"
                        @click="formVobo.idEstadoNuevo = RECHAZADO"
                    >
                        <i class="pi pi-times"></i> Rechazar
                    </button>
                </div>
            </div>
            <div class="campo campo--full">
                <label>Observaciones</label>
                <Textarea v-model="formVobo.observaciones" rows="3" placeholder="Motivo de la decisión..." class="w-full" />
            </div>
        </div>
        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogVobo = false" />
            <Button label="Registrar VoBo" icon="pi pi-check" :loading="guardandoVobo" @click="guardarVobo" />
        </template>
    </Dialog>

    <!-- ── Diálogo: Resolver ── -->
    <Dialog v-model:visible="dialogResolver" header="Resolver trámite" :style="{ width: '440px' }" modal>
        <div v-if="tramiteActivo" class="info-tramite">
            <span class="info-label">Trámite:</span>
            <span>{{ tramiteActivo.tipoTramiteNombre }} — {{ tramiteActivo.contratoNumero }}</span>
            <span class="info-label">Solicitó:</span>
            <span>{{ tramiteActivo.usuarioSolicitanteNombre }}</span>
            <span v-if="tramiteActivo.datosPropuestos" class="info-label">Datos:</span>
            <span v-if="tramiteActivo.datosPropuestos" class="info-datos">{{ tramiteActivo.datosPropuestos }}</span>
        </div>

        <div class="form-grid" style="margin-top: 1rem">
            <div class="campo campo--full">
                <label>Decisión <span class="req">*</span></label>
                <div class="decision-btns">
                    <button
                        class="decision-btn aprobar"
                        :class="{ seleccionado: formResolver.idEstadoNuevo === RESUELTO }"
                        @click="formResolver.idEstadoNuevo = RESUELTO"
                    >
                        <i class="pi pi-check"></i> Marcar como resuelto
                    </button>
                    <button
                        class="decision-btn rechazar"
                        :class="{ seleccionado: formResolver.idEstadoNuevo === RECHAZADO }"
                        @click="formResolver.idEstadoNuevo = RECHAZADO"
                    >
                        <i class="pi pi-times"></i> Rechazar
                    </button>
                </div>
            </div>
            <div class="campo campo--full">
                <label>Observaciones de resolución</label>
                <Textarea v-model="formResolver.observacionesResolucion" rows="3"
                    placeholder="Describe la acción tomada o el motivo del rechazo..." class="w-full" />
            </div>
        </div>
        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogResolver = false" />
            <Button label="Confirmar" icon="pi pi-check" :loading="guardandoResolver" @click="guardarResolver" />
        </template>
    </Dialog>
</template>

<style scoped>
/* ── Filtros de estado ── */
.barra-filtros {
    display: flex;
    gap: 0.4rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 0.5px solid #f1f5f9;
    flex-wrap: wrap;
}

.filtro-btn {
    padding: 0.3rem 0.85rem;
    border-radius: 20px;
    border: 1px solid #e5e7eb;
    background: white;
    color: #6b7280;
    font-size: 0.82rem;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
}

.filtro-btn:hover { border-color: #1a5276; color: #1a5276; }

.filtro-btn.activo {
    background: #1a5276;
    border-color: #1a5276;
    color: white;
    font-weight: 600;
}

/* ── Formularios ── */
.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.campo { display: flex; flex-direction: column; gap: 0.35rem; }
.campo--full { grid-column: 1 / -1; }
.campo label { font-size: 0.85rem; font-weight: 600; color: #374151; }
.req { color: #dc2626; }

/* ── Info del trámite en diálogos ── */
.info-tramite {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.4rem 0.75rem;
    align-items: start;
    background: #f9fafb;
    border: 0.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
}

.info-label { color: #9ca3af; font-weight: 600; white-space: nowrap; padding-top: 1px; }
.info-datos { color: #374151; font-size: 0.82rem; white-space: pre-wrap; }

/* ── Botones de decisión ── */
.decision-btns {
    display: flex;
    gap: 0.5rem;
}

.decision-btn {
    flex: 1;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    border: 1.5px solid #e5e7eb;
    background: white;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    transition: all 0.15s;
    color: #6b7280;
}

.decision-btn.aprobar:hover,
.decision-btn.aprobar.seleccionado {
    border-color: #15803d;
    background: #dcfce7;
    color: #15803d;
    font-weight: 600;
}

.decision-btn.rechazar:hover,
.decision-btn.rechazar.seleccionado {
    border-color: #dc2626;
    background: #fee2e2;
    color: #dc2626;
    font-weight: 600;
}
</style>
