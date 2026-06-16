<script setup>
import { ref, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import api from '../api/axios'

const toast   = useToast()
const confirm = useConfirm()

// ── Pestaña activa ────────────────────────────────────────────────────────
const tabActiva = ref('tipos')

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑA 1: Tipos de Descuento
// ═══════════════════════════════════════════════════════════════════════════
const tiposDescuento = ref([])
const cargandoTipos  = ref(false)

async function cargarTipos() {
    cargandoTipos.value = true
    try {
        const res = await api.get('/tipos-descuento')
        tiposDescuento.value = res.data.data
    } finally {
        cargandoTipos.value = false
    }
}

// ── Diálogo crear / editar tipo ───────────────────────────────────────────
const dialogTipo  = ref(false)
const modoEdicion = ref(false)
const guardando   = ref(false)

const formTipoVacio = () => ({
    idtipo_descuento: null,
    nombre:      '',
    porcentaje:  null,
    descripcion: '',
    activo:      1
})
const formTipo = ref(formTipoVacio())

function abrirNuevoTipo() {
    formTipo.value = formTipoVacio()
    modoEdicion.value = false
    dialogTipo.value  = true
}

function abrirEditarTipo(tipo) {
    formTipo.value = {
        idtipo_descuento: tipo.idtipo_descuento,
        nombre:      tipo.nombre,
        porcentaje:  Number(tipo.porcentaje),
        descripcion: tipo.descripcion || '',
        activo:      tipo.activo
    }
    modoEdicion.value = true
    dialogTipo.value  = true
}

async function guardarTipo() {
    if (!formTipo.value.nombre.trim()) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'El nombre es obligatorio', life: 3000 })
        return
    }
    if (formTipo.value.porcentaje == null || formTipo.value.porcentaje <= 0 || formTipo.value.porcentaje > 100) {
        toast.add({ severity: 'warn', summary: 'Porcentaje', detail: 'El porcentaje debe ser entre 0.01 y 100', life: 3000 })
        return
    }
    guardando.value = true
    try {
        const dto = {
            nombre:      formTipo.value.nombre.trim(),
            porcentaje:  formTipo.value.porcentaje,
            descripcion: formTipo.value.descripcion.trim(),
            activo:      formTipo.value.activo
        }
        if (modoEdicion.value) {
            const res = await api.put(`/tipos-descuento/${formTipo.value.idtipo_descuento}`, dto)
            const idx = tiposDescuento.value.findIndex(t => t.idtipo_descuento === formTipo.value.idtipo_descuento)
            if (idx !== -1) tiposDescuento.value[idx] = res.data.data
            toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Tipo de descuento actualizado', life: 3000 })
        } else {
            const res = await api.post('/tipos-descuento', { ...dto })
            tiposDescuento.value.unshift(res.data.data)
            toast.add({ severity: 'success', summary: 'Creado', detail: 'Tipo de descuento creado', life: 3000 })
        }
        dialogTipo.value = false
    } catch (e) {
        console.error(e)
        toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'No se pudo guardar', life: 5000 })
    } finally {
        guardando.value = false
    }
}

async function toggleActivo(tipo) {
    try {
        const dto = {
            nombre:      tipo.nombre,
            porcentaje:  tipo.porcentaje,
            descripcion: tipo.descripcion,
            activo:      tipo.activo === 1 ? 0 : 1
        }
        const res = await api.put(`/tipos-descuento/${tipo.idtipo_descuento}`, dto)
        const idx = tiposDescuento.value.findIndex(t => t.idtipo_descuento === tipo.idtipo_descuento)
        if (idx !== -1) tiposDescuento.value[idx] = res.data.data
        toast.add({ severity: 'info', summary: 'Actualizado', detail: `Descuento ${res.data.data.activo === 1 ? 'activado' : 'desactivado'}`, life: 3000 })
    } catch (e) {
        console.error(e)
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado', life: 5000 })
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑA 2: Asignación a Contratos
// ═══════════════════════════════════════════════════════════════════════════
const contratos          = ref([])
const contratoSelId      = ref(null)
const descuentosContrato = ref([])
const cargandoDesc       = ref(false)
const tiposActivos       = ref([])

watch(contratoSelId, async (id) => {
    descuentosContrato.value = []
    if (!id) return
    cargandoDesc.value = true
    try {
        const res = await api.get(`/contratos/${id}/descuentos`)
        descuentosContrato.value = res.data.data
    } finally {
        cargandoDesc.value = false
    }
})

// ── Diálogo: agregar descuento ────────────────────────────────────────────
const dialogAgregar  = ref(false)
const tipoSelId      = ref(null)
const agregando      = ref(false)

function abrirAgregar() {
    tipoSelId.value   = null
    dialogAgregar.value = true
}

async function agregarDescuento() {
    if (!tipoSelId.value) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'Selecciona un tipo de descuento', life: 3000 })
        return
    }
    agregando.value = true
    try {
        const res = await api.post(`/contratos/${contratoSelId.value}/descuentos`, { idTipoDescuento: tipoSelId.value })
        descuentosContrato.value.push(res.data.data)
        toast.add({ severity: 'success', summary: 'Asignado', detail: 'Descuento asignado al contrato', life: 3000 })
        dialogAgregar.value = false
    } catch (e) {
        console.error(e)
        toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'No se pudo asignar el descuento', life: 5000 })
    } finally {
        agregando.value = false
    }
}

function confirmarQuitar(cd) {
    confirm.require({
        message:  `¿Quitar el descuento "${cd.tipoDescuentoNombre}" de este contrato?`,
        header:   'Confirmar',
        icon:     'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, quitar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: () => quitarDescuento(cd)
    })
}

async function quitarDescuento(cd) {
    try {
        await api.delete(`/contratos/${contratoSelId.value}/descuentos/${cd.idcontrato_descuento}`)
        descuentosContrato.value = descuentosContrato.value.filter(d => d.idcontrato_descuento !== cd.idcontrato_descuento)
        toast.add({ severity: 'info', summary: 'Quitado', detail: 'Descuento removido del contrato', life: 3000 })
    } catch (e) {
        console.error(e)
        toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'No se pudo quitar el descuento', life: 5000 })
    }
}

// ── Inicialización ────────────────────────────────────────────────────────
onMounted(async () => {
    const [tipos, cons] = await Promise.allSettled([
        api.get('/tipos-descuento'),
        api.get('/contratos')
    ])
    if (tipos.status === 'fulfilled') {
        tiposDescuento.value = tipos.value.data.data
        tiposActivos.value   = tiposDescuento.value.filter(t => t.activo === 1)
    }
    if (cons.status === 'fulfilled') {
        contratos.value = cons.value.data.data
            .filter(c => c.estadoContratoNombre?.toLowerCase() === 'activo')
            .map(c => ({ ...c, etiqueta: `${c.numeroContrato} — ${c.titularNombre}` }))
    }
})

// Recalcula los tipos activos cuando cambia la lista (por crear/editar)
watch(tiposDescuento, (lista) => {
    tiposActivos.value = lista.filter(t => t.activo === 1)
}, { deep: true })

const formatPct = (v) => v != null ? `${Number(v).toFixed(2)}%` : '—'
</script>

<template>
    <div class="pagina-card">

        <!-- Encabezado -->
        <div class="pagina-card-header">
            <span class="pagina-card-titulo">Descuentos</span>
        </div>

        <!-- Pestañas -->
        <Tabs v-model:value="tabActiva">
            <TabList>
                <Tab value="tipos">Tipos de descuento</Tab>
                <Tab value="asignacion">Asignación a contratos</Tab>
            </TabList>

            <TabPanels>

                <!-- ══ PESTAÑA 1: Tipos de descuento ══ -->
                <TabPanel value="tipos">
                    <div class="tab-toolbar">
                        <Button label="Nuevo tipo" icon="pi pi-plus" size="small" @click="abrirNuevoTipo" />
                    </div>

                    <DataTable
                        :value="tiposDescuento"
                        :loading="cargandoTipos"
                        paginator
                        :rows="10"
                        :rowsPerPageOptions="[10, 25, 50]"
                        stripedRows
                        scrollable
                        scrollHeight="calc(100vh - 360px)"
                    >
                        <template #empty>No hay tipos de descuento registrados.</template>

                        <Column field="idtipo_descuento" header="ID"          style="width: 70px" />
                        <Column field="nombre"           header="Nombre"       style="width: 200px" />
                        <Column header="Porcentaje" style="width: 120px">
                            <template #body="{ data }">{{ formatPct(data.porcentaje) }}</template>
                        </Column>
                        <Column field="descripcion" header="Descripción" />

                        <Column header="Estado" style="width: 100px">
                            <template #body="{ data }">
                                <span :class="data.activo === 1 ? 'tag-activo' : 'tag-cerrado'">
                                    {{ data.activo === 1 ? 'Activo' : 'Inactivo' }}
                                </span>
                            </template>
                        </Column>

                        <Column header="Acciones" style="width: 100px">
                            <template #body="{ data }">
                                <Button
                                    icon="pi pi-pencil"
                                    severity="secondary" text rounded size="small"
                                    v-tooltip="'Editar'"
                                    @click="abrirEditarTipo(data)"
                                />
                                <Button
                                    :icon="data.activo === 1 ? 'pi pi-eye-slash' : 'pi pi-eye'"
                                    severity="secondary" text rounded size="small"
                                    :v-tooltip="data.activo === 1 ? 'Desactivar' : 'Activar'"
                                    @click="toggleActivo(data)"
                                />
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>

                <!-- ══ PESTAÑA 2: Asignación a contratos ══ -->
                <TabPanel value="asignacion">
                    <div class="campo" style="max-width: 480px; margin-bottom: 1.25rem">
                        <label class="campo-label">Contrato (solo activos)</label>
                        <Select
                            v-model="contratoSelId"
                            :options="contratos"
                            optionLabel="etiqueta"
                            optionValue="idcontrato"
                            placeholder="Selecciona un contrato..."
                            filter
                            showClear
                            class="w-full"
                        />
                    </div>

                    <template v-if="contratoSelId">
                        <div class="tab-toolbar">
                            <span class="descuentos-titulo">Descuentos aplicados</span>
                            <Button label="Agregar descuento" icon="pi pi-plus" size="small" @click="abrirAgregar" />
                        </div>

                        <DataTable
                            :value="descuentosContrato"
                            :loading="cargandoDesc"
                            stripedRows
                            size="small"
                        >
                            <template #empty>Este contrato no tiene descuentos asignados.</template>

                            <Column field="tipoDescuentoNombre" header="Tipo de descuento" />
                            <Column header="Porcentaje" style="width: 120px">
                                <template #body="{ data }">{{ formatPct(data.porcentaje) }}</template>
                            </Column>
                            <Column field="descripcion" header="Descripción" />
                            <Column header="" style="width: 70px">
                                <template #body="{ data }">
                                    <Button
                                        icon="pi pi-times"
                                        severity="danger" text rounded size="small"
                                        v-tooltip="'Quitar descuento'"
                                        @click="confirmarQuitar(data)"
                                    />
                                </template>
                            </Column>
                        </DataTable>
                    </template>

                    <div v-else class="sin-seleccion">
                        <i class="pi pi-info-circle"></i>
                        Selecciona un contrato para ver y gestionar sus descuentos.
                    </div>
                </TabPanel>

            </TabPanels>
        </Tabs>
    </div>

    <!-- ── Diálogo: Crear / Editar tipo ── -->
    <Dialog
        v-model:visible="dialogTipo"
        :header="modoEdicion ? 'Editar tipo de descuento' : 'Nuevo tipo de descuento'"
        :style="{ width: '460px' }"
        modal
    >
        <div class="form-grid">
            <div class="campo campo--full">
                <label>Nombre <span class="req">*</span></label>
                <InputText v-model="formTipo.nombre" placeholder="Ej. Adulto mayor" class="w-full" />
            </div>
            <div class="campo">
                <label>Porcentaje (%) <span class="req">*</span></label>
                <InputNumber
                    v-model="formTipo.porcentaje"
                    :minFractionDigits="2"
                    :maxFractionDigits="2"
                    :min="0.01"
                    :max="100"
                    placeholder="Ej. 25.00"
                    class="w-full"
                />
            </div>
            <div class="campo">
                <label>Estado</label>
                <div class="estado-toggle">
                    <ToggleSwitch v-model:modelValue="formTipo.activo" :trueValue="1" :falseValue="0" inputId="activoTipo" />
                    <label for="activoTipo">{{ formTipo.activo === 1 ? 'Activo' : 'Inactivo' }}</label>
                </div>
            </div>
            <div class="campo campo--full">
                <label>Descripción</label>
                <Textarea v-model="formTipo.descripcion" rows="2" placeholder="Descripción opcional..." class="w-full" />
            </div>
        </div>
        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogTipo = false" />
            <Button
                :label="modoEdicion ? 'Guardar cambios' : 'Crear'"
                icon="pi pi-check"
                :loading="guardando"
                @click="guardarTipo"
            />
        </template>
    </Dialog>

    <!-- ── Diálogo: Agregar descuento a contrato ── -->
    <Dialog v-model:visible="dialogAgregar" header="Agregar descuento" :style="{ width: '400px' }" modal>
        <div class="campo">
            <label>Tipo de descuento <span class="req">*</span></label>
            <Select
                v-model="tipoSelId"
                :options="tiposActivos"
                optionLabel="nombre"
                optionValue="idtipo_descuento"
                placeholder="Selecciona..."
                class="w-full"
            >
                <template #option="{ option }">
                    {{ option.nombre }} — {{ formatPct(option.porcentaje) }}
                </template>
            </Select>
        </div>
        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogAgregar = false" />
            <Button label="Agregar" icon="pi pi-check" :loading="agregando" @click="agregarDescuento" />
        </template>
    </Dialog>
</template>

<style scoped>
.tab-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
}

.descuentos-titulo {
    font-weight: 600;
    font-size: 0.9rem;
    color: #374151;
}

.campo { display: flex; flex-direction: column; gap: 0.35rem; }
.campo-label { font-size: 0.85rem; font-weight: 600; color: #374151; }
.campo--full { grid-column: 1 / -1; }

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-grid .campo label,
.campo > label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
}

.req { color: #dc2626; }

.estado-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.35rem;
    font-size: 0.875rem;
    color: #6b7280;
}

.sin-seleccion {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #9ca3af;
    font-size: 0.875rem;
    padding: 2rem 0;
}
</style>
