<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useTitularesStore } from '../stores/titulares'

const store   = useTitularesStore()
const toast   = useToast()

// ── Búsqueda ──────────────────────────────────────────────────────────────
const busqueda = ref('')

async function buscar() {
    const q = busqueda.value.trim()
    if (q.length === 0) {
        await store.cargarTodos()
    } else {
        await store.buscar(q)
    }
}

function limpiarBusqueda() {
    busqueda.value = ''
    store.cargarTodos()
}

// ── Diálogo alta / edición ────────────────────────────────────────────────
const dialogVisible = ref(false)
const modoEdicion   = ref(false)
const guardando     = ref(false)

// Objeto vacío que representa el formulario
const formVacio = () => ({
    idtitular:           null,
    curp:                '',
    nombres:             '',
    apellido1:           '',
    apellido2:           '',
    tipoIdentificacion:  null,
    numeroIdentificacion:'',
    telefono:            '',
    correo:              ''
})

const form = ref(formVacio())

const tiposIdentificacion = [
    { label: 'INE / IFE',      value: 'INE' },
    { label: 'Pasaporte',      value: 'PASAPORTE' },
    { label: 'CURP',           value: 'CURP' },
    { label: 'Licencia',       value: 'LICENCIA' },
    { label: 'Otro',           value: 'OTRO' }
]

function abrirNuevo() {
    form.value    = formVacio()
    modoEdicion.value  = false
    dialogVisible.value = true
}

function abrirEdicion(titular) {
    form.value = {
        idtitular:            titular.idtitular,
        curp:                 titular.curp             || '',
        nombres:              titular.nombres           || '',
        apellido1:            titular.apellido1         || '',
        apellido2:            titular.apellido2         || '',
        tipoIdentificacion:   titular.tipoIdentificacion || null,
        numeroIdentificacion: titular.numeroIdentificacion || '',
        telefono:             titular.telefono          || '',
        correo:               titular.correo            || ''
    }
    modoEdicion.value   = true
    dialogVisible.value = true
}

async function guardar() {
    // Validación básica
    if (!form.value.nombres.trim() || !form.value.apellido1.trim()) {
        toast.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Nombre y primer apellido son obligatorios', life: 3000 })
        return
    }

    guardando.value = true
    try {
        // El DTO que espera el backend (sin idtitular)
        const dto = {
            curp:                form.value.curp.toUpperCase(),
            nombres:             form.value.nombres,
            apellido1:           form.value.apellido1,
            apellido2:           form.value.apellido2,
            tipoIdentificacion:  form.value.tipoIdentificacion,
            numeroIdentificacion:form.value.numeroIdentificacion.toUpperCase(),
            telefono:            form.value.telefono,
            correo:              form.value.correo
        }

        if (modoEdicion.value) {
            await store.actualizar(form.value.idtitular, dto)
            toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Titular actualizado correctamente', life: 3000 })
        } else {
            await store.crear(dto)
            toast.add({ severity: 'success', summary: 'Registrado', detail: 'Titular dado de alta correctamente', life: 3000 })
        }

        dialogVisible.value = false
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el titular', life: 4000 })
    } finally {
        guardando.value = false
    }
}

// ── Inicialización ────────────────────────────────────────────────────────
// onMounted se ejecuta cuando el componente termina de montarse en el DOM
// Es el equivalente al @PostConstruct de Spring: el momento justo para cargar datos
onMounted(() => store.cargarTodos())
</script>

<template>
    <div class="pagina-card">

        <!-- Encabezado con título y botón Nuevo -->
        <div class="pagina-card-header">
            <span class="pagina-card-titulo">Titulares</span>
            <Button
                label="Nuevo titular"
                icon="pi pi-plus"
                size="small"
                @click="abrirNuevo"
            />
        </div>

        <!-- Barra de búsqueda -->
        <div class="barra-busqueda">
            <span class="p-input-icon-left busqueda-wrap">
                <InputText
                    v-model="busqueda"
                    placeholder="Buscar por nombre, apellido o CURP..."
                    class="busqueda-input"
                    @keyup.enter="buscar"
                />
            </span>
            <Button icon="pi pi-search" severity="secondary" outlined size="small" @click="buscar" />
            <Button icon="pi pi-times"  severity="secondary" text     size="small" @click="limpiarBusqueda" v-tooltip="'Limpiar'" />
        </div>

        <!-- Tabla -->
        <DataTable
            :value="store.titulares"
            :loading="store.cargando"
            paginator
            :rows="15"
            :rowsPerPageOptions="[10, 15, 25, 50]"
            scrollable
            scrollHeight="calc(100vh - 260px)"
            stripedRows
        >
            <template #empty>No se encontraron titulares.</template>

            <Column field="idtitular" header="ID" style="width: 70px" />

            <Column header="Nombre completo">
                <template #body="{ data }">
                    {{ data.nombres }} {{ data.apellido1 }} {{ data.apellido2 }}
                </template>
            </Column>

            <Column field="curp" header="CURP" />

            <Column field="tipoIdentificacion" header="Identificación" style="width: 140px" />

            <Column field="telefono" header="Teléfono" style="width: 130px" />

            <Column field="correo" header="Correo" />

            <Column header="Acciones" style="width: 90px; text-align: center">
                <template #body="{ data }">
                    <Button
                        icon="pi pi-pencil"
                        severity="secondary"
                        text
                        rounded
                        size="small"
                        v-tooltip="'Editar'"
                        @click="abrirEdicion(data)"
                    />
                </template>
            </Column>
        </DataTable>
    </div>

    <!-- Diálogo alta / edición -->
    <Dialog
        v-model:visible="dialogVisible"
        :header="modoEdicion ? 'Editar titular' : 'Nuevo titular'"
        :style="{ width: '520px' }"
        modal
    >
        <div class="form-grid">

            <div class="campo campo--full">
                <label>Nombres <span class="req">*</span></label>
                <InputText v-model="form.nombres" placeholder="Nombres" class="w-full" />
            </div>

            <div class="campo">
                <label>Primer apellido <span class="req">*</span></label>
                <InputText v-model="form.apellido1" placeholder="Apellido paterno" class="w-full" />
            </div>

            <div class="campo">
                <label>Segundo apellido</label>
                <InputText v-model="form.apellido2" placeholder="Apellido materno" class="w-full" />
            </div>

            <div class="campo">
                <label>CURP</label>
                <InputText v-model="form.curp" placeholder="CURP (18 caracteres)" class="w-full" style="text-transform: uppercase" />
            </div>

            <div class="campo">
                <label>Tipo de identificación</label>
                <Select
                    v-model="form.tipoIdentificacion"
                    :options="tiposIdentificacion"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Selecciona..."
                    class="w-full"
                />
            </div>

            <div class="campo campo--full">
                <label>Número de identificación</label>
                <InputText v-model="form.numeroIdentificacion" placeholder="Número de documento" class="w-full" style="text-transform: uppercase" />
            </div>

            <div class="campo">
                <label>Teléfono</label>
                <InputText v-model="form.telefono" placeholder="10 dígitos" class="w-full" />
            </div>

            <div class="campo">
                <label>Correo electrónico</label>
                <InputText v-model="form.correo" placeholder="correo@ejemplo.com" class="w-full" />
            </div>

        </div>

        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogVisible = false" />
            <Button
                :label="modoEdicion ? 'Guardar cambios' : 'Dar de alta'"
                icon="pi pi-check"
                :loading="guardando"
                @click="guardar"
            />
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

.busqueda-wrap {
    flex: 1;
    max-width: 420px;
}

.busqueda-input {
    width: 100%;
}

/* Grid del formulario: 2 columnas */
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

/* campo--full ocupa las 2 columnas */
.campo--full {
    grid-column: 1 / -1;
}

.campo label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
}

.req {
    color: #dc2626;
}
</style>
