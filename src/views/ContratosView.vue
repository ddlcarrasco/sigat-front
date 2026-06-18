<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useContratosStore } from '../stores/contratos'
import api from '../api/axios'

const store = useContratosStore()
const toast = useToast()

// ── Catálogos ─────────────────────────────────────────────────────────────
const sectores        = ref([])
const categorias      = ref([])
const estadosContrato = ref([])
const titulares       = ref([])
const tecnicos        = ref([])       // solo usuarios con rol TECNICO (para instalador)

// ── Filtro de texto (lado cliente) ───────────────────────────────────────
const filtroTexto = ref('')

const contratosFiltrados = computed(() => {
    const q = filtroTexto.value.trim().toLowerCase()
    if (!q) return store.contratos
    return store.contratos.filter(c =>
        (c.numeroContrato || '').toLowerCase().includes(q) ||
        (c.titularNombre  || '').toLowerCase().includes(q) ||
        (c.domicilioToma  || '').toLowerCase().includes(q)
    )
})

// ── Color del tag de estado ───────────────────────────────────────────────
const claseEstado = (nombre) => {
    if (!nombre) return ''
    const n = nombre.toLowerCase()
    if (n.includes('activ'))     return 'tag-activo'
    if (n.includes('suspend'))   return 'tag-suspendido'
    if (n.includes('cancel'))    return 'tag-cancelado'
    if (n.includes('nuevo'))     return 'tag-pendiente'
    return 'tag-pendiente'
}

// ── Diálogo: Nuevo / Editar contrato ─────────────────────────────────────
const dialogForm   = ref(false)
const modoEdicion  = ref(false)
const guardando    = ref(false)

// El ID del estado "Nuevo contrato" se detecta automáticamente al cargar catálogos
const idEstadoNuevo = ref(null)

const numeroContratoProximo = ref('')   // folio generado automáticamente

const formVacio = () => ({
    idcontrato:          null,
    numeroCatastro:      '',
    domicilioToma:       '',
    fechaInstalacion:    null,
    observaciones:       '',
    titularId:           null,
    sectorId:            null,
    categoriaId:         null,
    estadoContratoId:    null,
    usuarioInstaladorId: null
})

const form = ref(formVacio())

async function abrirNuevo() {
    form.value = formVacio()
    form.value.estadoContratoId = idEstadoNuevo.value
    modoEdicion.value  = false
    numeroContratoProximo.value = ''
    try {
        const res = await api.get('/contratos/siguiente-numero')
        numeroContratoProximo.value = res.data.data
    } catch {
        numeroContratoProximo.value = '—'
    }
    dialogForm.value = true
}

function abrirEdicion(contrato) {
    numeroContratoProximo.value = contrato.numeroContrato || ''
    form.value = {
        idcontrato:          contrato.idcontrato,
        numeroCatastro:      contrato.numeroCatastro      || '',
        domicilioToma:       contrato.domicilioToma       || '',
        fechaInstalacion:    null,   // no se edita
        observaciones:       contrato.observaciones       || '',
        titularId:           contrato.titularId,
        sectorId:            contrato.sectorId,
        categoriaId:         contrato.categoriaId,
        estadoContratoId:    contrato.estadoContratoId,
        usuarioInstaladorId: contrato.usuarioInstaladorId || null
    }
    modoEdicion.value = true
    dialogForm.value  = true
}

async function guardar() {
    if (!form.value.titularId || !form.value.sectorId || !form.value.categoriaId) {
        toast.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Titular, sector y categoría son obligatorios', life: 3000 })
        return
    }

    guardando.value = true
    try {
        const dto = {
            numeroCatastro:      form.value.numeroCatastro,
            domicilioToma:       form.value.domicilioToma,
            observaciones:       form.value.observaciones,
            titularId:           form.value.titularId,
            sectorId:            form.value.sectorId,
            categoriaId:         form.value.categoriaId,
            estadoContratoId:    form.value.estadoContratoId,
            usuarioInstaladorId: form.value.usuarioInstaladorId,
            // Convertir Date a YYYY-MM-DD para LocalDate de Java
            fechaInstalacion: form.value.fechaInstalacion
                ? form.value.fechaInstalacion.toISOString().split('T')[0]
                : null
        }

        if (modoEdicion.value) {
            await store.actualizar(form.value.idcontrato, dto)
            toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Contrato actualizado correctamente', life: 3000 })
        } else {
            await store.crear(dto)
            toast.add({ severity: 'success', summary: 'Creado', detail: 'Contrato creado correctamente', life: 3000 })
        }
        dialogForm.value = false
    } catch (e) {
        console.error('Error al guardar contrato:', e)
        const detalle = e.response?.data?.message || e.message || 'No se pudo guardar el contrato'
        toast.add({ severity: 'error', summary: 'Error', detail: detalle, life: 5000 })
    } finally {
        guardando.value = false
    }
}

// ── Diálogo: Cambiar estado ───────────────────────────────────────────────
const dialogEstado         = ref(false)
const contratoSeleccionado = ref(null)
const cambiando            = ref(false)

const formEstado = ref({
    idEstadoNuevo: null,
    observaciones: ''
})

function abrirCambioEstado(contrato) {
    contratoSeleccionado.value = contrato
    formEstado.value = { idEstadoNuevo: null, observaciones: '' }
    dialogEstado.value = true
}

async function guardarEstado() {
    if (!formEstado.value.idEstadoNuevo) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'Selecciona el nuevo estado', life: 3000 })
        return
    }

    cambiando.value = true
    try {
        await store.cambiarEstado(contratoSeleccionado.value.idcontrato, formEstado.value)
        toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Estado del contrato actualizado', life: 3000 })
        dialogEstado.value = false
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado', life: 4000 })
    } finally {
        cambiando.value = false
    }
}

// ── Inicialización ────────────────────────────────────────────────────────
onMounted(async () => {
    const [, sec, cat, est, tit, tec] = await Promise.allSettled([
        store.cargarTodos(),
        api.get('/sectores/activos'),
        api.get('/categorias/activas'),
        api.get('/estados-contrato'),
        api.get('/titulares'),
        api.get('/usuarios/por-rol/TECNICO')
    ])
    if (sec.status === 'fulfilled') sectores.value        = sec.value.data.data
    if (cat.status === 'fulfilled') categorias.value      = cat.value.data.data
    if (est.status === 'fulfilled') estadosContrato.value = est.value.data.data
    if (tit.status === 'fulfilled') titulares.value       = tit.value.data.data.map(t => ({
        ...t,
        nombreCompleto: `${t.nombres} ${t.apellido1} ${t.apellido2 || ''}`.trim()
    }))
    if (tec.status === 'fulfilled') tecnicos.value = tec.value.data.data.map(u => ({
        ...u,
        nombreCompleto: `${u.nombres} ${u.apellidoPaterno}`
    }))

    // Detectar automáticamente el estado "Nuevo contrato" (o el primero que contenga "nuevo")
    const estadoNuevo = estadosContrato.value.find(e =>
        e.nombre.toLowerCase().includes('nuevo')
    )
    if (estadoNuevo) idEstadoNuevo.value = estadoNuevo.idestado_contrato
})
</script>

<template>
    <div class="pagina-card">

        <!-- Encabezado -->
        <div class="pagina-card-header">
            <span class="pagina-card-titulo">Contratos</span>
            <Button label="Nuevo contrato" icon="pi pi-plus" size="small" @click="abrirNuevo" />
        </div>

        <!-- Filtro -->
        <div class="barra-busqueda">
            <InputText
                v-model="filtroTexto"
                placeholder="Filtrar por N° contrato, titular o domicilio..."
                class="busqueda-input"
            />
            <Button icon="pi pi-times" severity="secondary" text size="small"
                v-tooltip="'Limpiar'" @click="filtroTexto = ''" />
        </div>

        <!-- Tabla -->
        <DataTable
            :value="contratosFiltrados"
            :loading="store.cargando"
            paginator
            :rows="15"
            :rowsPerPageOptions="[10, 15, 25, 50]"
            scrollable
            scrollHeight="calc(100vh - 260px)"
            stripedRows
        >
            <template #empty>No se encontraron contratos.</template>

            <Column field="idcontrato"     header="ID"           style="width: 70px" />
            <Column field="numeroContrato" header="N° Contrato"  style="width: 140px" />
            <Column field="titularNombre"  header="Titular" />
            <Column field="domicilioToma"  header="Domicilio" />
            <Column field="sectorNombre"   header="Sector"       style="width: 120px" />
            <Column field="categoriaNombre" header="Categoría"   style="width: 120px" />

            <Column header="Estado" style="width: 130px">
                <template #body="{ data }">
                    <span :class="claseEstado(data.estadoContratoNombre)">
                        {{ data.estadoContratoNombre }}
                    </span>
                </template>
            </Column>

            <Column field="fechaInstalacion" header="F. Instalación" style="width: 130px" />

            <Column header="Acciones" style="width: 110px; text-align: center">
                <template #body="{ data }">
                    <Button
                        icon="pi pi-pencil"
                        severity="secondary"
                        text rounded size="small"
                        v-tooltip="'Editar contrato'"
                        @click="abrirEdicion(data)"
                    />
                    <Button
                        icon="pi pi-sync"
                        severity="secondary"
                        text rounded size="small"
                        v-tooltip="'Cambiar estado'"
                        @click="abrirCambioEstado(data)"
                    />
                </template>
            </Column>
        </DataTable>
    </div>

    <!-- ── Diálogo: Nuevo / Editar contrato ── -->
    <Dialog
        v-model:visible="dialogForm"
        :header="modoEdicion ? 'Editar contrato' : 'Nuevo contrato'"
        :style="{ width: '580px' }"
        modal
    >
        <div class="form-grid">

            <div class="campo">
                <label>Número de contrato</label>
                <div class="folio-display">{{ numeroContratoProximo || '…' }}</div>
            </div>

            <div class="campo">
                <label>Número de catastro</label>
                <InputText v-model="form.numeroCatastro" placeholder="Clave catastral" class="w-full" />
            </div>

            <div class="campo campo--full">
                <label>Titular <span class="req">*</span></label>
                <Select
                    v-model="form.titularId"
                    :options="titulares"
                    optionLabel="nombreCompleto"
                    optionValue="idtitular"
                    placeholder="Busca y selecciona un titular..."
                    filter
                    class="w-full"
                />
            </div>

            <div class="campo campo--full">
                <label>Domicilio de la toma</label>
                <InputText v-model="form.domicilioToma" placeholder="Calle, número, colonia..." class="w-full" />
            </div>

            <div class="campo">
                <label>Sector <span class="req">*</span></label>
                <Select
                    v-model="form.sectorId"
                    :options="sectores"
                    optionLabel="nombre"
                    optionValue="idsector"
                    placeholder="Selecciona..."
                    class="w-full"
                />
            </div>

            <div class="campo">
                <label>Categoría <span class="req">*</span></label>
                <Select
                    v-model="form.categoriaId"
                    :options="categorias"
                    optionLabel="nombre"
                    optionValue="idcategoria"
                    placeholder="Selecciona..."
                    class="w-full"
                />
            </div>

            <div class="campo" v-if="!modoEdicion">
                <label>Fecha de instalación</label>
                <DatePicker
                    v-model="form.fechaInstalacion"
                    dateFormat="dd/mm/yy"
                    placeholder="dd/mm/aaaa"
                    class="w-full"
                />
            </div>

            <div class="campo">
                <label>Técnico instalador</label>
                <Select
                    v-model="form.usuarioInstaladorId"
                    :options="tecnicos"
                    optionLabel="nombreCompleto"
                    optionValue="idusuario"
                    placeholder="Opcional..."
                    class="w-full"
                />
            </div>

            <div class="campo campo--full">
                <label>Observaciones</label>
                <Textarea v-model="form.observaciones" rows="3" placeholder="Notas adicionales..." class="w-full" />
            </div>

        </div>

        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogForm = false" />
            <Button
                :label="modoEdicion ? 'Guardar cambios' : 'Crear contrato'"
                icon="pi pi-check"
                :loading="guardando"
                @click="guardar"
            />
        </template>
    </Dialog>

    <!-- ── Diálogo: Cambiar estado ── -->
    <Dialog v-model:visible="dialogEstado" header="Cambiar estado del contrato" :style="{ width: '440px' }" modal>
        <div v-if="contratoSeleccionado" class="info-contrato">
            <span class="info-label">Contrato:</span>
            <span class="info-valor">{{ contratoSeleccionado.numeroContrato }} — {{ contratoSeleccionado.titularNombre }}</span>
            <span class="info-label">Estado actual:</span>
            <span :class="claseEstado(contratoSeleccionado.estadoContratoNombre)">
                {{ contratoSeleccionado.estadoContratoNombre }}
            </span>
        </div>

        <div class="form-grid" style="margin-top: 1rem">

            <div class="campo campo--full">
                <label>Nuevo estado <span class="req">*</span></label>
                <Select
                    v-model="formEstado.idEstadoNuevo"
                    :options="estadosContrato.filter(e => e.nombre.toLowerCase() !== 'activo')"
                    optionLabel="nombre"
                    optionValue="idestado_contrato"
                    placeholder="Selecciona el nuevo estado..."
                    class="w-full"
                />
            </div>

            <div class="campo campo--full">
                <label>Observaciones</label>
                <Textarea v-model="formEstado.observaciones" rows="3" placeholder="Motivo del cambio..." class="w-full" />
            </div>

        </div>

        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogEstado = false" />
            <Button label="Guardar cambio" icon="pi pi-check" :loading="cambiando" @click="guardarEstado" />
        </template>
    </Dialog>
</template>

<style scoped>
.barra-busqueda {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 0.5px solid #f1f5f9;
}

.busqueda-input {
    flex: 1;
    max-width: 440px;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.campo {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.campo--full {
    grid-column: 1 / -1;
}

.campo label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
}

.req { color: #dc2626; }

.folio-display {
    background: #f9fafb;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1a5276;
    letter-spacing: 0.05em;
}

.info-contrato {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.4rem 0.75rem;
    align-items: center;
    background: #f9fafb;
    border: 0.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
}

.info-label {
    color: #9ca3af;
    font-weight: 600;
    white-space: nowrap;
}

.info-valor { color: #374151; }
</style>
