<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import api from '../api/axios'

const toast = useToast()

// ── Tabs ─────────────────────────────────────────────────────────────────────
const tabActiva = ref('categorias')

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORÍAS
// ══════════════════════════════════════════════════════════════════════════════
const categorias     = ref([])
const cargandoCat    = ref(false)
const dialogCat      = ref(false)
const guardandoCat   = ref(false)
const modoCat        = ref('nuevo') // 'nuevo' | 'editar'

const catForm = ref({ idcategoria: null, nombre: '', descripcion: '', activo: 1 })

async function cargarCategorias() {
    cargandoCat.value = true
    try {
        const res = await api.get('/categorias')
        categorias.value = res.data.data ?? res.data
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las categorías', life: 3000 })
    } finally {
        cargandoCat.value = false
    }
}

function abrirNuevaCat() {
    modoCat.value = 'nuevo'
    catForm.value = { idcategoria: null, nombre: '', descripcion: '', activo: 1 }
    dialogCat.value = true
}

function abrirEditarCat(cat) {
    modoCat.value = 'editar'
    catForm.value = { ...cat }
    dialogCat.value = true
}

async function guardarCat() {
    if (!catForm.value.nombre?.trim()) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'El nombre es obligatorio', life: 3000 })
        return
    }
    guardandoCat.value = true
    try {
        const body = {
            nombre:      catForm.value.nombre.trim(),
            descripcion: catForm.value.descripcion?.trim() || null,
            activo:      catForm.value.activo
        }
        if (modoCat.value === 'nuevo') {
            await api.post('/categorias', body)
            toast.add({ severity: 'success', summary: 'Creada', detail: 'Categoría creada correctamente', life: 3000 })
        } else {
            await api.put(`/categorias/${catForm.value.idcategoria}`, body)
            toast.add({ severity: 'success', summary: 'Actualizada', detail: 'Categoría actualizada', life: 3000 })
        }
        dialogCat.value = false
        await cargarCategorias()
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la categoría', life: 3000 })
    } finally {
        guardandoCat.value = false
    }
}

async function toggleActivoCat(cat) {
    try {
        await api.put(`/categorias/${cat.idcategoria}`, {
            nombre:      cat.nombre,
            descripcion: cat.descripcion,
            activo:      cat.activo === 1 ? 0 : 1
        })
        await cargarCategorias()
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado', life: 3000 })
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTORES
// ══════════════════════════════════════════════════════════════════════════════
const sectores      = ref([])
const cargandoSec   = ref(false)
const dialogSec     = ref(false)
const guardandoSec  = ref(false)
const modoSec       = ref('nuevo')

const secForm = ref({ idsector: null, nombre: '', descripcion: '', activo: 1 })

async function cargarSectores() {
    cargandoSec.value = true
    try {
        const res = await api.get('/sectores')
        sectores.value = res.data.data ?? res.data
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los sectores', life: 3000 })
    } finally {
        cargandoSec.value = false
    }
}

function abrirNuevoSec() {
    modoSec.value = 'nuevo'
    secForm.value = { idsector: null, nombre: '', descripcion: '', activo: 1 }
    dialogSec.value = true
}

function abrirEditarSec(sec) {
    modoSec.value = 'editar'
    secForm.value = { ...sec }
    dialogSec.value = true
}

async function guardarSec() {
    if (!secForm.value.nombre?.trim()) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'El nombre es obligatorio', life: 3000 })
        return
    }
    guardandoSec.value = true
    try {
        const body = {
            nombre:      secForm.value.nombre.trim(),
            descripcion: secForm.value.descripcion?.trim() || null,
            activo:      secForm.value.activo
        }
        if (modoSec.value === 'nuevo') {
            await api.post('/sectores', body)
            toast.add({ severity: 'success', summary: 'Creado', detail: 'Sector creado correctamente', life: 3000 })
        } else {
            await api.put(`/sectores/${secForm.value.idsector}`, body)
            toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Sector actualizado', life: 3000 })
        }
        dialogSec.value = false
        await cargarSectores()
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el sector', life: 3000 })
    } finally {
        guardandoSec.value = false
    }
}

async function toggleActivoSec(sec) {
    try {
        await api.put(`/sectores/${sec.idsector}`, {
            nombre:      sec.nombre,
            descripcion: sec.descripcion,
            activo:      sec.activo === 1 ? 0 : 1
        })
        await cargarSectores()
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado', life: 3000 })
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// TARIFAS
// ══════════════════════════════════════════════════════════════════════════════
const tarifas       = ref([])
const cargandoTar   = ref(false)
const dialogTar     = ref(false)
const guardandoTar  = ref(false)
const modoTar       = ref('nuevo')

const tarForm = ref({
    idtarifa:     null,
    montoMensual: null,
    fechaDesde:   null,
    fechaHasta:   null,
    activa:       1,
    observaciones: '',
    sectorId:     null,
    categoriaId:  null
})

const sectoresActivos   = computed(() => sectores.value.filter(s => s.activo === 1))
const categoriasActivas = computed(() => categorias.value.filter(c => c.activo === 1))

async function cargarTarifas() {
    cargandoTar.value = true
    try {
        const res = await api.get('/tarifas')
        tarifas.value = res.data.data ?? res.data
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las tarifas', life: 3000 })
    } finally {
        cargandoTar.value = false
    }
}

function abrirNuevaTar() {
    modoTar.value = 'nuevo'
    tarForm.value = {
        idtarifa: null, montoMensual: null, fechaDesde: null,
        fechaHasta: null, activa: 1, observaciones: '', sectorId: null, categoriaId: null
    }
    dialogTar.value = true
}

function abrirEditarTar(tar) {
    modoTar.value = 'editar'
    tarForm.value = {
        idtarifa:      tar.idtarifa,
        montoMensual:  tar.montoMensual,
        fechaDesde:    tar.fechaDesde   ? new Date(tar.fechaDesde)   : null,
        fechaHasta:    tar.fechaHasta   ? new Date(tar.fechaHasta)   : null,
        activa:        tar.activa,
        observaciones: tar.observaciones || '',
        sectorId:      tar.sectorId,
        categoriaId:   tar.categoriaId
    }
    dialogTar.value = true
}

function formatFecha(date) {
    if (!date) return null
    if (typeof date === 'string') return date
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

async function guardarTar() {
    if (!tarForm.value.montoMensual || !tarForm.value.fechaDesde || !tarForm.value.sectorId || !tarForm.value.categoriaId) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'Monto, fecha desde, sector y categoría son obligatorios', life: 3000 })
        return
    }
    guardandoTar.value = true
    try {
        const body = {
            montoMensual:  tarForm.value.montoMensual,
            fechaDesde:    formatFecha(tarForm.value.fechaDesde),
            fechaHasta:    formatFecha(tarForm.value.fechaHasta),
            activa:        tarForm.value.activa,
            observaciones: tarForm.value.observaciones?.trim() || null,
            sectorId:      tarForm.value.sectorId,
            categoriaId:   tarForm.value.categoriaId
        }
        if (modoTar.value === 'nuevo') {
            await api.post('/tarifas', body)
            toast.add({ severity: 'success', summary: 'Creada', detail: 'Tarifa creada correctamente', life: 3000 })
        } else {
            await api.put(`/tarifas/${tarForm.value.idtarifa}`, body)
            toast.add({ severity: 'success', summary: 'Actualizada', detail: 'Tarifa actualizada', life: 3000 })
        }
        dialogTar.value = false
        await cargarTarifas()
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la tarifa', life: 3000 })
    } finally {
        guardandoTar.value = false
    }
}

async function toggleActivaTar(tar) {
    try {
        await api.put(`/tarifas/${tar.idtarifa}`, {
            montoMensual:  tar.montoMensual,
            fechaDesde:    tar.fechaDesde,
            fechaHasta:    tar.fechaHasta,
            activa:        tar.activa === 1 ? 0 : 1,
            observaciones: tar.observaciones,
            sectorId:      tar.sectorId,
            categoriaId:   tar.categoriaId
        })
        await cargarTarifas()
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado', life: 3000 })
    }
}

// ── Inicio ────────────────────────────────────────────────────────────────────
onMounted(async () => {
    const [resCat, resSec, resTar] = await Promise.allSettled([
        api.get('/categorias'),
        api.get('/sectores'),
        api.get('/tarifas')
    ])
    if (resCat.status === 'fulfilled') categorias.value = resCat.value.data.data ?? resCat.value.data
    if (resSec.status === 'fulfilled') sectores.value  = resSec.value.data.data ?? resSec.value.data
    if (resTar.status === 'fulfilled') tarifas.value   = resTar.value.data.data ?? resTar.value.data
})
</script>

<template>
    <div class="pagina-card">
        <div class="pagina-card-header">
            <span class="pagina-card-titulo">Catálogos</span>
        </div>

        <Tabs v-model:value="tabActiva">
            <TabList>
                <Tab value="categorias">Categorías</Tab>
                <Tab value="sectores">Sectores</Tab>
                <Tab value="tarifas">Tarifas</Tab>
            </TabList>

            <TabPanels>

                <!-- ══════════ CATEGORÍAS ══════════ -->
                <TabPanel value="categorias">
                    <div class="tab-acciones">
                        <Button label="Nueva categoría" icon="pi pi-plus" size="small" @click="abrirNuevaCat" />
                    </div>

                    <DataTable :value="categorias" :loading="cargandoCat"
                               paginator :rows="10" stripedRows
                               emptyMessage="Sin categorías registradas">
                        <Column field="idcategoria" header="ID"      style="width:80px" />
                        <Column field="nombre"      header="Nombre"  />
                        <Column field="descripcion" header="Descripción" />
                        <Column header="Estado" style="width:110px">
                            <template #body="{ data }">
                                <span :class="data.activo === 1 ? 'tag-activo' : 'tag-cancelado'">
                                    {{ data.activo === 1 ? 'Activo' : 'Inactivo' }}
                                </span>
                            </template>
                        </Column>
                        <Column header="Acciones" style="width:160px">
                            <template #body="{ data }">
                                <div class="acciones-fila">
                                    <Button icon="pi pi-pencil" size="small" text rounded
                                            title="Editar"
                                            @click="abrirEditarCat(data)" />
                                    <Button :icon="data.activo === 1 ? 'pi pi-ban' : 'pi pi-check-circle'"
                                            size="small" text rounded
                                            :severity="data.activo === 1 ? 'warn' : 'success'"
                                            :title="data.activo === 1 ? 'Desactivar' : 'Activar'"
                                            @click="toggleActivoCat(data)" />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>

                <!-- ══════════ SECTORES ══════════ -->
                <TabPanel value="sectores">
                    <div class="tab-acciones">
                        <Button label="Nuevo sector" icon="pi pi-plus" size="small" @click="abrirNuevoSec" />
                    </div>

                    <DataTable :value="sectores" :loading="cargandoSec"
                               paginator :rows="10" stripedRows
                               emptyMessage="Sin sectores registrados">
                        <Column field="idsector"    header="ID"      style="width:80px" />
                        <Column field="nombre"      header="Nombre"  />
                        <Column field="descripcion" header="Descripción" />
                        <Column header="Estado" style="width:110px">
                            <template #body="{ data }">
                                <span :class="data.activo === 1 ? 'tag-activo' : 'tag-cancelado'">
                                    {{ data.activo === 1 ? 'Activo' : 'Inactivo' }}
                                </span>
                            </template>
                        </Column>
                        <Column header="Acciones" style="width:160px">
                            <template #body="{ data }">
                                <div class="acciones-fila">
                                    <Button icon="pi pi-pencil" size="small" text rounded
                                            title="Editar"
                                            @click="abrirEditarSec(data)" />
                                    <Button :icon="data.activo === 1 ? 'pi pi-ban' : 'pi pi-check-circle'"
                                            size="small" text rounded
                                            :severity="data.activo === 1 ? 'warn' : 'success'"
                                            :title="data.activo === 1 ? 'Desactivar' : 'Activar'"
                                            @click="toggleActivoSec(data)" />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>

                <!-- ══════════ TARIFAS ══════════ -->
                <TabPanel value="tarifas">
                    <div class="tab-acciones">
                        <Button label="Nueva tarifa" icon="pi pi-plus" size="small" @click="abrirNuevaTar" />
                    </div>

                    <DataTable :value="tarifas" :loading="cargandoTar"
                               paginator :rows="10" stripedRows
                               emptyMessage="Sin tarifas registradas">
                        <Column field="idtarifa"      header="ID"        style="width:70px" />
                        <Column field="sectorNombre"   header="Sector"    />
                        <Column field="categoriaNombre" header="Categoría" />
                        <Column header="Monto mensual" style="width:140px">
                            <template #body="{ data }">
                                ${{ Number(data.montoMensual).toFixed(2) }}
                            </template>
                        </Column>
                        <Column header="Vigencia" style="width:200px">
                            <template #body="{ data }">
                                {{ data.fechaDesde }}
                                <span v-if="data.fechaHasta"> — {{ data.fechaHasta }}</span>
                                <span v-else class="sin-fin"> (sin fin)</span>
                            </template>
                        </Column>
                        <Column header="Estado" style="width:110px">
                            <template #body="{ data }">
                                <span :class="data.activa === 1 ? 'tag-activo' : 'tag-cancelado'">
                                    {{ data.activa === 1 ? 'Activa' : 'Inactiva' }}
                                </span>
                            </template>
                        </Column>
                        <Column header="Acciones" style="width:160px">
                            <template #body="{ data }">
                                <div class="acciones-fila">
                                    <Button icon="pi pi-pencil" size="small" text rounded
                                            title="Editar"
                                            @click="abrirEditarTar(data)" />
                                    <Button :icon="data.activa === 1 ? 'pi pi-ban' : 'pi pi-check-circle'"
                                            size="small" text rounded
                                            :severity="data.activa === 1 ? 'warn' : 'success'"
                                            :title="data.activa === 1 ? 'Desactivar' : 'Activar'"
                                            @click="toggleActivaTar(data)" />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>

            </TabPanels>
        </Tabs>
    </div>

    <!-- ══════════ DIALOG CATEGORÍA ══════════ -->
    <Dialog v-model:visible="dialogCat"
            :header="modoCat === 'nuevo' ? 'Nueva categoría' : 'Editar categoría'"
            :style="{ width: '420px' }" modal>
        <div class="form-grid">
            <div class="form-campo">
                <label>Nombre *</label>
                <InputText v-model="catForm.nombre" placeholder="Nombre de la categoría" />
            </div>
            <div class="form-campo">
                <label>Descripción</label>
                <Textarea v-model="catForm.descripcion" rows="3" placeholder="Descripción opcional" autoResize />
            </div>
            <div class="form-campo form-campo--inline" v-if="modoCat === 'editar'">
                <label>Activo</label>
                <ToggleSwitch v-model="catForm.activo" :trueValue="1" :falseValue="0" />
            </div>
        </div>
        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogCat = false" />
            <Button label="Guardar" icon="pi pi-check" :loading="guardandoCat" @click="guardarCat" />
        </template>
    </Dialog>

    <!-- ══════════ DIALOG SECTOR ══════════ -->
    <Dialog v-model:visible="dialogSec"
            :header="modoSec === 'nuevo' ? 'Nuevo sector' : 'Editar sector'"
            :style="{ width: '420px' }" modal>
        <div class="form-grid">
            <div class="form-campo">
                <label>Nombre *</label>
                <InputText v-model="secForm.nombre" placeholder="Nombre del sector" />
            </div>
            <div class="form-campo">
                <label>Descripción</label>
                <Textarea v-model="secForm.descripcion" rows="3" placeholder="Descripción opcional" autoResize />
            </div>
            <div class="form-campo form-campo--inline" v-if="modoSec === 'editar'">
                <label>Activo</label>
                <ToggleSwitch v-model="secForm.activo" :trueValue="1" :falseValue="0" />
            </div>
        </div>
        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogSec = false" />
            <Button label="Guardar" icon="pi pi-check" :loading="guardandoSec" @click="guardarSec" />
        </template>
    </Dialog>

    <!-- ══════════ DIALOG TARIFA ══════════ -->
    <Dialog v-model:visible="dialogTar"
            :header="modoTar === 'nuevo' ? 'Nueva tarifa' : 'Editar tarifa'"
            :style="{ width: '480px' }" modal>
        <div class="form-grid">
            <div class="form-campo">
                <label>Sector *</label>
                <Select v-model="tarForm.sectorId"
                        :options="sectoresActivos"
                        optionLabel="nombre" optionValue="idsector"
                        placeholder="Seleccionar sector" />
            </div>
            <div class="form-campo">
                <label>Categoría *</label>
                <Select v-model="tarForm.categoriaId"
                        :options="categoriasActivas"
                        optionLabel="nombre" optionValue="idcategoria"
                        placeholder="Seleccionar categoría" />
            </div>
            <div class="form-campo">
                <label>Monto mensual ($) *</label>
                <InputNumber v-model="tarForm.montoMensual"
                             mode="decimal" :minFractionDigits="2" :maxFractionDigits="2"
                             :min="0" placeholder="0.00" />
            </div>
            <div class="form-fila-dos">
                <div class="form-campo">
                    <label>Fecha desde *</label>
                    <DatePicker v-model="tarForm.fechaDesde"
                                dateFormat="yy-mm-dd" placeholder="AAAA-MM-DD"
                                showIcon iconDisplay="input" />
                </div>
                <div class="form-campo">
                    <label>Fecha hasta</label>
                    <DatePicker v-model="tarForm.fechaHasta"
                                dateFormat="yy-mm-dd" placeholder="AAAA-MM-DD (opcional)"
                                showIcon iconDisplay="input" />
                </div>
            </div>
            <div class="form-campo">
                <label>Observaciones</label>
                <Textarea v-model="tarForm.observaciones" rows="2" placeholder="Observaciones opcionales" autoResize />
            </div>
            <div class="form-campo form-campo--inline" v-if="modoTar === 'editar'">
                <label>Activa</label>
                <ToggleSwitch v-model="tarForm.activa" :trueValue="1" :falseValue="0" />
            </div>
        </div>
        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogTar = false" />
            <Button label="Guardar" icon="pi pi-check" :loading="guardandoTar" @click="guardarTar" />
        </template>
    </Dialog>
</template>

<style scoped>
.tab-acciones {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.75rem;
}

.acciones-fila {
    display: flex;
    gap: 0.25rem;
}

.form-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-campo {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.form-campo label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #6b7280;
}

.form-campo :deep(.p-inputtext),
.form-campo :deep(.p-select),
.form-campo :deep(.p-datepicker),
.form-campo :deep(.p-inputnumber-input),
.form-campo :deep(.p-textarea) {
    width: 100%;
}

.form-campo--inline {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
}

.form-fila-dos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
}

.sin-fin {
    font-size: 0.8rem;
    color: #9ca3af;
}
</style>
