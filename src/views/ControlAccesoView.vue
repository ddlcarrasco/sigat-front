<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import api from '../api/axios'

const toast   = useToast()
const confirm = useConfirm()

// ── Estado ────────────────────────────────────────────────────────────────
const usuarios    = ref([])
const roles       = ref([])
const cargando    = ref(false)
const mostrarInactivos = ref(false)

// ── Filtros ───────────────────────────────────────────────────────────────
const filtroTexto = ref('')
const filtroRol   = ref(null)

const usuariosFiltrados = computed(() => {
    let lista = usuarios.value

    if (!mostrarInactivos.value)
        lista = lista.filter(u => u.activo === 1)

    if (filtroRol.value)
        lista = lista.filter(u => u.rolId === filtroRol.value)

    const q = filtroTexto.value.trim().toLowerCase()
    if (q)
        lista = lista.filter(u =>
            (u.username      || '').toLowerCase().includes(q) ||
            (u.nombres       || '').toLowerCase().includes(q) ||
            (u.apellidoPaterno|| '').toLowerCase().includes(q)
        )

    return lista
})

// ── Carga de datos ────────────────────────────────────────────────────────
async function cargar() {
    cargando.value = true
    try {
        const res = await api.get('/usuarios')
        usuarios.value = res.data.data
    } finally {
        cargando.value = false
    }
}

// ── Diálogo: Crear / Editar ───────────────────────────────────────────────
const dialogForm  = ref(false)
const modoEdicion = ref(false)
const guardando   = ref(false)

const formVacio = () => ({
    idusuario:      null,
    username:       '',
    password:       '',
    nombres:        '',
    apellidoPaterno:'',
    apellidoMaterno:'',
    correo:         '',
    rolId:          null
})

const form = ref(formVacio())

function abrirNuevo() {
    form.value    = formVacio()
    modoEdicion.value  = false
    dialogForm.value   = true
}

function abrirEdicion(usuario) {
    form.value = {
        idusuario:       usuario.idusuario,
        username:        usuario.username,
        password:        '',           // no se edita
        nombres:         usuario.nombres        || '',
        apellidoPaterno: usuario.apellidoPaterno|| '',
        apellidoMaterno: usuario.apellidoMaterno|| '',
        correo:          usuario.correo         || '',
        rolId:           usuario.rolId
    }
    modoEdicion.value = true
    dialogForm.value  = true
}

async function guardar() {
    if (!form.value.nombres.trim() || !form.value.apellidoPaterno.trim() || !form.value.rolId) {
        toast.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Nombre, apellido paterno y rol son obligatorios', life: 3000 })
        return
    }
    if (!modoEdicion.value && !form.value.username.trim()) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'El username es obligatorio', life: 3000 })
        return
    }
    if (!modoEdicion.value && form.value.password.length < 6) {
        toast.add({ severity: 'warn', summary: 'Contraseña', detail: 'La contraseña debe tener al menos 6 caracteres', life: 3000 })
        return
    }

    guardando.value = true
    try {
        if (modoEdicion.value) {
            const dto = {
                // username y password no se envían en edición (el backend los ignora)
                nombres:         form.value.nombres,
                apellidoPaterno: form.value.apellidoPaterno,
                apellidoMaterno: form.value.apellidoMaterno,
                correo:          form.value.correo,
                rolId:           form.value.rolId
            }
            const res = await api.put(`/usuarios/${form.value.idusuario}`, dto)
            const idx = usuarios.value.findIndex(u => u.idusuario === form.value.idusuario)
            if (idx !== -1) usuarios.value[idx] = res.data.data
            toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Usuario actualizado correctamente', life: 3000 })
        } else {
            const dto = {
                username:        form.value.username,
                password:        form.value.password,
                nombres:         form.value.nombres,
                apellidoPaterno: form.value.apellidoPaterno,
                apellidoMaterno: form.value.apellidoMaterno,
                correo:          form.value.correo,
                rolId:           form.value.rolId
            }
            const res = await api.post('/usuarios', dto)
            usuarios.value.unshift(res.data.data)
            toast.add({ severity: 'success', summary: 'Creado', detail: 'Usuario creado correctamente', life: 3000 })
        }
        dialogForm.value = false
    } catch (e) {
        console.error(e)
        toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'No se pudo guardar el usuario', life: 5000 })
    } finally {
        guardando.value = false
    }
}

// ── Cambiar contraseña ────────────────────────────────────────────────────
const dialogPassword  = ref(false)
const nuevaPassword   = ref('')
const confirmarPassword = ref('')
const guardandoPass   = ref(false)
const idUsuarioPass   = ref(null)

function abrirCambioPassword() {
    idUsuarioPass.value     = form.value.idusuario
    nuevaPassword.value     = ''
    confirmarPassword.value = ''
    dialogPassword.value    = true
}

async function guardarPassword() {
    if (nuevaPassword.value.length < 6) {
        toast.add({ severity: 'warn', summary: 'Contraseña', detail: 'La contraseña debe tener al menos 6 caracteres', life: 3000 })
        return
    }
    if (nuevaPassword.value !== confirmarPassword.value) {
        toast.add({ severity: 'warn', summary: 'Contraseña', detail: 'Las contraseñas no coinciden', life: 3000 })
        return
    }
    guardandoPass.value = true
    try {
        await api.patch(`/usuarios/${idUsuarioPass.value}/password`, { nuevaPassword: nuevaPassword.value })
        toast.add({ severity: 'success', summary: 'Listo', detail: 'Contraseña actualizada correctamente', life: 3000 })
        dialogPassword.value = false
    } catch (e) {
        console.error(e)
        toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'No se pudo cambiar la contraseña', life: 5000 })
    } finally {
        guardandoPass.value = false
    }
}

// ── Desactivar usuario ────────────────────────────────────────────────────
function confirmarDesactivar(usuario) {
    confirm.require({
        message:  `¿Desactivar al usuario "${usuario.username}"? No podrá iniciar sesión.`,
        header:   'Confirmar desactivación',
        icon:     'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, desactivar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: () => desactivar(usuario)
    })
}

async function desactivar(usuario) {
    try {
        await api.delete(`/usuarios/${usuario.idusuario}`)
        const idx = usuarios.value.findIndex(u => u.idusuario === usuario.idusuario)
        if (idx !== -1) usuarios.value[idx] = { ...usuarios.value[idx], activo: 0 }
        toast.add({ severity: 'info', summary: 'Desactivado', detail: `Usuario "${usuario.username}" desactivado`, life: 3000 })
    } catch (e) {
        console.error(e)
        toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'No se pudo desactivar el usuario', life: 5000 })
    }
}

// ── Inicialización ────────────────────────────────────────────────────────
onMounted(async () => {
    const [, rol] = await Promise.all([
        cargar(),
        api.get('/roles')
    ])
    roles.value = rol.data.data
})
</script>

<template>
    <div class="pagina-card">

        <!-- Encabezado -->
        <div class="pagina-card-header">
            <span class="pagina-card-titulo">Control de Acceso</span>
            <Button label="Nuevo usuario" icon="pi pi-user-plus" size="small" @click="abrirNuevo" />
        </div>

        <!-- Filtros -->
        <div class="barra-filtros">
            <InputText
                v-model="filtroTexto"
                placeholder="Filtrar por username o nombre..."
                class="filtro-texto"
            />
            <Select
                v-model="filtroRol"
                :options="roles"
                optionLabel="nombre"
                optionValue="idrol"
                placeholder="Todos los roles"
                showClear
                class="filtro-rol"
            />
            <!-- ToggleSwitch para mostrar/ocultar inactivos -->
            <div class="toggle-inactivos">
                <ToggleSwitch v-model="mostrarInactivos" inputId="inactivos" />
                <label for="inactivos">Mostrar inactivos</label>
            </div>
        </div>

        <!-- Tabla -->
        <DataTable
            :value="usuariosFiltrados"
            :loading="cargando"
            paginator
            :rows="15"
            :rowsPerPageOptions="[10, 15, 25, 50]"
            scrollable
            scrollHeight="calc(100vh - 280px)"
            stripedRows
        >
            <template #empty>No se encontraron usuarios.</template>

            <Column field="idusuario"       header="ID"       style="width: 70px" />
            <Column field="username"        header="Username" style="width: 150px" />

            <Column header="Nombre completo">
                <template #body="{ data }">
                    {{ data.nombres }} {{ data.apellidoPaterno }} {{ data.apellidoMaterno }}
                </template>
            </Column>

            <Column field="correo"   header="Correo" />
            <Column field="rolNombre" header="Rol"   style="width: 120px" />

            <Column header="Estado" style="width: 100px">
                <template #body="{ data }">
                    <span :class="data.activo === 1 ? 'tag-activo' : 'tag-cerrado'">
                        {{ data.activo === 1 ? 'Activo' : 'Inactivo' }}
                    </span>
                </template>
            </Column>

            <Column header="Acciones" style="width: 100px; text-align: center">
                <template #body="{ data }">
                    <Button
                        icon="pi pi-pencil"
                        severity="secondary" text rounded size="small"
                        v-tooltip="'Editar'"
                        @click="abrirEdicion(data)"
                    />
                    <Button
                        v-if="data.activo === 1"
                        icon="pi pi-ban"
                        severity="danger" text rounded size="small"
                        v-tooltip="'Desactivar'"
                        @click="confirmarDesactivar(data)"
                    />
                </template>
            </Column>
        </DataTable>
    </div>

    <!-- ── Diálogo: Crear / Editar usuario ── -->
    <Dialog
        v-model:visible="dialogForm"
        :header="modoEdicion ? 'Editar usuario' : 'Nuevo usuario'"
        :style="{ width: '520px' }"
        modal
    >
        <div class="form-grid">

            <!-- Username y password solo en creación -->
            <div class="campo" v-if="!modoEdicion">
                <label>Username <span class="req">*</span></label>
                <InputText v-model="form.username" placeholder="Ej. jperez" class="w-full" />
            </div>

            <div class="campo" v-if="!modoEdicion">
                <label>Contraseña <span class="req">*</span></label>
                <Password
                    v-model="form.password"
                    placeholder="Mínimo 6 caracteres"
                    :feedback="false"
                    toggleMask
                    class="w-full"
                />
            </div>

            <!-- En edición mostramos el username como texto no editable -->
            <div class="campo campo--full" v-if="modoEdicion">
                <label>Username</label>
                <div class="username-readonly">{{ form.username }}</div>
            </div>

            <div class="campo">
                <label>Nombres <span class="req">*</span></label>
                <InputText v-model="form.nombres" placeholder="Nombre(s)" class="w-full" />
            </div>

            <div class="campo">
                <label>Apellido paterno <span class="req">*</span></label>
                <InputText v-model="form.apellidoPaterno" placeholder="Apellido paterno" class="w-full" />
            </div>

            <div class="campo">
                <label>Apellido materno</label>
                <InputText v-model="form.apellidoMaterno" placeholder="Apellido materno" class="w-full" />
            </div>

            <div class="campo">
                <label>Correo</label>
                <InputText v-model="form.correo" placeholder="correo@ejemplo.com" class="w-full" />
            </div>

            <div class="campo campo--full">
                <label>Rol <span class="req">*</span></label>
                <Select
                    v-model="form.rolId"
                    :options="roles"
                    optionLabel="nombre"
                    optionValue="idrol"
                    placeholder="Selecciona un rol..."
                    class="w-full"
                />
            </div>

        </div>

        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogForm = false" />
            <Button
                v-if="modoEdicion"
                label="Cambiar contraseña"
                icon="pi pi-lock"
                severity="secondary"
                outlined
                @click="abrirCambioPassword"
            />
            <Button
                :label="modoEdicion ? 'Guardar cambios' : 'Crear usuario'"
                icon="pi pi-check"
                :loading="guardando"
                @click="guardar"
            />
        </template>
    </Dialog>

    <!-- ── Diálogo: Cambiar contraseña ── -->
    <Dialog
        v-model:visible="dialogPassword"
        header="Cambiar contraseña"
        :style="{ width: '380px' }"
        modal
    >
        <div class="form-grid" style="grid-template-columns: 1fr">
            <div class="campo">
                <label>Nueva contraseña <span class="req">*</span></label>
                <Password
                    v-model="nuevaPassword"
                    placeholder="Mínimo 6 caracteres"
                    :feedback="false"
                    toggleMask
                    class="w-full"
                />
            </div>
            <div class="campo">
                <label>Confirmar contraseña <span class="req">*</span></label>
                <Password
                    v-model="confirmarPassword"
                    placeholder="Repite la contraseña"
                    :feedback="false"
                    toggleMask
                    class="w-full"
                />
            </div>
        </div>

        <template #footer>
            <Button label="Cancelar" severity="secondary" text @click="dialogPassword = false" />
            <Button
                label="Guardar contraseña"
                icon="pi pi-check"
                :loading="guardandoPass"
                @click="guardarPassword"
            />
        </template>
    </Dialog>
</template>

<style scoped>
.barra-filtros {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 0.5px solid #f1f5f9;
    flex-wrap: wrap;
}

.filtro-texto { flex: 1; max-width: 320px; }
.filtro-rol   { width: 180px; }

.toggle-inactivos {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
    margin-left: auto;
}

.toggle-inactivos label { cursor: pointer; }

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.campo { display: flex; flex-direction: column; gap: 0.35rem; }
.campo--full { grid-column: 1 / -1; }
.campo label { font-size: 0.85rem; font-weight: 600; color: #374151; }
.req { color: #dc2626; }

.username-readonly {
    padding: 0.5rem 0.75rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #6b7280;
}
</style>
