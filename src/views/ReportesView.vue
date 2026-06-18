<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import * as XLSX from 'xlsx'
import api from '../api/axios'

const toast = useToast()

// ── Tabs ─────────────────────────────────────────────────────────────────────
const tabActiva = ref('resumen')

// ── Meses en español ─────────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function nombreMes(periodoYYYYMM) {
    const [, mes] = periodoYYYYMM.split('-')
    return MESES[parseInt(mes, 10) - 1] + ' ' + periodoYYYYMM.split('-')[0]
}

// ── Estado global de carga ────────────────────────────────────────────────────
const cargando    = ref(false)
const chartVersion = ref(0)   // se incrementa para forzar re-render de Charts

// ── Filtros de fecha ──────────────────────────────────────────────────────────
const hoy       = new Date()
const primerDiaAnio = new Date(hoy.getFullYear(), 0, 1)

const fechaDesde = ref(primerDiaAnio)
const fechaHasta = ref(hoy)

function formatFecha(d) {
    if (!d) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dia}`
}

// ══════════════════════════════════════════════════════════════════════════════
// RESUMEN
// ══════════════════════════════════════════════════════════════════════════════
const resumen = ref(null)

async function cargarResumen() {
    const res = await api.get('/reportes/resumen')
    resumen.value = res.data.data
}

// ══════════════════════════════════════════════════════════════════════════════
// COBROS POR MES
// ══════════════════════════════════════════════════════════════════════════════
const cobrosMes = ref([])

async function cargarCobrosMes() {
    try {
        const res = await api.get('/reportes/cobros-por-mes', {
            params: { desde: formatFecha(fechaDesde.value), hasta: formatFecha(fechaHasta.value) }
        })
        cobrosMes.value = res.data.data ?? []
    } catch {
        cobrosMes.value = []
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los cobros por mes', life: 3000 })
    }
}

const chartCobros = computed(() => ({
    labels: cobrosMes.value.map(r => nombreMes(r.periodo)),
    datasets: [{
        label: 'Cobros ($)',
        data: cobrosMes.value.map(r => Number(r.total)),
        backgroundColor: 'rgba(26, 82, 118, 0.7)',
        borderColor: '#1a5276',
        borderWidth: 1,
        borderRadius: 4
    }]
}))

const chartOpcionesBarras = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
        y: { ticks: { callback: v => '$' + v.toLocaleString() } }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTRATOS Y TRÁMITES
// ══════════════════════════════════════════════════════════════════════════════
const contratosPorEstado = ref([])
const tramitesPorEstado  = ref([])
const tramitesPorTipo    = ref([])

const COLORES_PIE = [
    'rgba(26,82,118,0.8)', 'rgba(39,174,96,0.8)', 'rgba(211,84,0,0.8)',
    'rgba(142,68,173,0.8)', 'rgba(44,62,80,0.8)', 'rgba(22,160,133,0.8)',
    'rgba(192,57,43,0.8)', 'rgba(243,156,18,0.8)'
]

function buildPie(datos, campo) {
    return {
        labels: datos.map(d => d.nombre),
        datasets: [{
            data: datos.map(d => d[campo]),
            backgroundColor: COLORES_PIE.slice(0, datos.length),
            borderWidth: 1
        }]
    }
}

const chartContratos = computed(() => buildPie(contratosPorEstado.value, 'cantidad'))
const chartTramEstado = computed(() => buildPie(tramitesPorEstado.value, 'cantidad'))
const chartTramTipo   = computed(() => buildPie(tramitesPorTipo.value, 'cantidad'))

const chartOpcionesPie = {
    responsive: true,
    plugins: { legend: { position: 'right' } }
}

// ══════════════════════════════════════════════════════════════════════════════
// RECIBOS PENDIENTES
// ══════════════════════════════════════════════════════════════════════════════
const recibosPendientes  = ref([])
const filtroPendiente    = ref('')

const pendientesFiltrados = computed(() => {
    const q = filtroPendiente.value.toLowerCase()
    if (!q) return recibosPendientes.value
    return recibosPendientes.value.filter(r =>
        (r.numeroContrato || '').toLowerCase().includes(q) ||
        (r.titularNombre  || '').toLowerCase().includes(q) ||
        (r.sectorNombre   || '').toLowerCase().includes(q) ||
        (r.categoriaNombre || '').toLowerCase().includes(q)
    )
})

const totalPendiente = computed(() =>
    pendientesFiltrados.value.reduce((s, r) => s + Number(r.monto || 0), 0)
)

// ══════════════════════════════════════════════════════════════════════════════
// INGRESOS POR SECTOR / CATEGORÍA
// ══════════════════════════════════════════════════════════════════════════════
const ingresosSector    = ref([])
const ingresosCategoria = ref([])

async function cargarIngresos() {
    const params = { desde: formatFecha(fechaDesde.value), hasta: formatFecha(fechaHasta.value) }
    try {
        const [resSec, resCat] = await Promise.allSettled([
            api.get('/reportes/ingresos-por-sector',    { params }),
            api.get('/reportes/ingresos-por-categoria', { params })
        ])
        if (resSec.status === 'fulfilled') ingresosSector.value    = resSec.value.data.data ?? []
        else ingresosSector.value = []
        if (resCat.status === 'fulfilled') ingresosCategoria.value = resCat.value.data.data ?? []
        else ingresosCategoria.value = []
    } catch {
        ingresosSector.value = []
        ingresosCategoria.value = []
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los ingresos', life: 3000 })
    }
}

function buildBarras(datos, campo) {
    return {
        labels: datos.map(d => d.nombre),
        datasets: [{
            label: 'Ingresos ($)',
            data: datos.map(d => Number(d[campo])),
            backgroundColor: COLORES_PIE.slice(0, datos.length),
            borderWidth: 1,
            borderRadius: 4
        }]
    }
}

const chartSector    = computed(() => buildBarras(ingresosSector.value, 'total'))
const chartCategoria = computed(() => buildBarras(ingresosCategoria.value, 'total'))

// ══════════════════════════════════════════════════════════════════════════════
// APLICAR FILTROS (cobros + ingresos)
// ══════════════════════════════════════════════════════════════════════════════
async function aplicarFiltros() {
    if (!fechaDesde.value || !fechaHasta.value) {
        toast.add({ severity: 'warn', summary: 'Fechas requeridas', detail: 'Selecciona fecha de inicio y fin', life: 3000 })
        return
    }
    cargando.value = true
    try {
        await cargarCobrosMes()
        await cargarIngresos()
        chartVersion.value++
        toast.add({ severity: 'success', summary: 'Filtros aplicados',
            detail: `Del ${formatFecha(fechaDesde.value)} al ${formatFecha(fechaHasta.value)}`, life: 2000 })
    } finally {
        cargando.value = false
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTAR EXCEL
// ══════════════════════════════════════════════════════════════════════════════
function exportarExcel(filas, columnas, nombreArchivo) {
    const datos = filas.map(f => {
        const obj = {}
        columnas.forEach(c => { obj[c.header] = f[c.field] })
        return obj
    })
    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}

function exportarCobrosExcel() {
    exportarExcel(
        cobrosMes.value.map(r => ({ periodo: nombreMes(r.periodo), total: Number(r.total) })),
        [{ field: 'periodo', header: 'Periodo' }, { field: 'total', header: 'Total cobrado ($)' }],
        'Cobros_por_mes'
    )
}

function exportarPendientesExcel() {
    const cols = [
        { field: 'numeroContrato',  header: 'Contrato' },
        { field: 'titularNombre',   header: 'Titular' },
        { field: 'anio',            header: 'Año' },
        { field: 'mes',             header: 'Mes' },
        { field: 'monto',           header: 'Monto ($)' },
        { field: 'fechaVencimiento', header: 'Vencimiento' },
        { field: 'estadoNombre',    header: 'Estado' },
        { field: 'sectorNombre',    header: 'Sector' },
        { field: 'categoriaNombre', header: 'Categoría' },
    ]
    exportarExcel(pendientesFiltrados.value, cols, 'Recibos_pendientes')
}

function exportarIngresosExcel() {
    exportarExcel(
        ingresosSector.value.map(r => ({ nombre: r.nombre, total: Number(r.total) })),
        [{ field: 'nombre', header: 'Sector' }, { field: 'total', header: 'Total ($)' }],
        'Ingresos_por_sector'
    )
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTAR PDF (ventana de impresión)
// ══════════════════════════════════════════════════════════════════════════════
function exportarPDF(titulo, encabezados, filas) {
    const estilos = `
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
        h2 { color: #1a5276; margin-bottom: 12px; }
        p  { font-size: 11px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1a5276; color: white; padding: 7px 10px; text-align: left; font-size: 11px; }
        td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
        tr:nth-child(even) td { background: #f9fafb; }
        .total { font-weight: 600; margin-top: 8px; }
        @media print { @page { margin: 1.5cm; } }
    `
    const thead = `<tr>${encabezados.map(h => `<th>${h}</th>`).join('')}</tr>`
    const tbody = filas.map(f => `<tr>${f.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')
    const html = `<html><head><title>${titulo}</title><style>${estilos}</style></head>
        <body><h2>${titulo}</h2><p>Generado el ${new Date().toLocaleDateString('es-MX')}</p>
        <table><thead>${thead}</thead><tbody>${tbody}</tbody></table></body></html>`
    const v = window.open('', '_blank')
    v.document.write(html)
    v.document.close()
    setTimeout(() => v.print(), 400)
}

function exportarCobrosPDF() {
    exportarPDF(
        'Cobros por mes',
        ['Periodo', 'Total cobrado ($)'],
        cobrosMes.value.map(r => [nombreMes(r.periodo), '$' + Number(r.total).toFixed(2)])
    )
}

function exportarPendientesPDF() {
    exportarPDF(
        'Recibos pendientes de pago',
        ['Contrato', 'Titular', 'Año', 'Mes', 'Monto ($)', 'Vencimiento', 'Estado', 'Sector'],
        pendientesFiltrados.value.map(r => [
            r.numeroContrato, r.titularNombre, r.anio, r.mes,
            '$' + Number(r.monto).toFixed(2), r.fechaVencimiento, r.estadoNombre, r.sectorNombre
        ])
    )
}

function exportarIngresosPDF() {
    exportarPDF(
        'Ingresos por sector',
        ['Sector', 'Total ($)'],
        ingresosSector.value.map(r => [r.nombre, '$' + Number(r.total).toFixed(2)])
    )
}

// ══════════════════════════════════════════════════════════════════════════════
// CARGA INICIAL
// ══════════════════════════════════════════════════════════════════════════════
onMounted(async () => {
    cargando.value = true
    try {
        const [resRes, resCobros, resCon, resTramEst, resTramTip, resPend, resSec, resCat] =
            await Promise.allSettled([
                api.get('/reportes/resumen'),
                api.get('/reportes/cobros-por-mes', { params: { desde: formatFecha(fechaDesde.value), hasta: formatFecha(fechaHasta.value) } }),
                api.get('/reportes/contratos-por-estado'),
                api.get('/reportes/tramites-por-estado'),
                api.get('/reportes/tramites-por-tipo'),
                api.get('/reportes/recibos-pendientes'),
                api.get('/reportes/ingresos-por-sector',    { params: { desde: formatFecha(fechaDesde.value), hasta: formatFecha(fechaHasta.value) } }),
                api.get('/reportes/ingresos-por-categoria', { params: { desde: formatFecha(fechaDesde.value), hasta: formatFecha(fechaHasta.value) } })
            ])

        if (resRes.status    === 'fulfilled') resumen.value            = resRes.value.data.data
        if (resCobros.status === 'fulfilled') cobrosMes.value          = resCobros.value.data.data ?? []
        if (resCon.status    === 'fulfilled') contratosPorEstado.value = resCon.value.data.data    ?? []
        if (resTramEst.status === 'fulfilled') tramitesPorEstado.value = resTramEst.value.data.data ?? []
        if (resTramTip.status === 'fulfilled') tramitesPorTipo.value   = resTramTip.value.data.data ?? []
        if (resPend.status   === 'fulfilled') recibosPendientes.value  = resPend.value.data.data   ?? []
        if (resSec.status    === 'fulfilled') ingresosSector.value     = resSec.value.data.data    ?? []
        if (resCat.status    === 'fulfilled') ingresosCategoria.value  = resCat.value.data.data    ?? []
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los reportes', life: 3000 })
    } finally {
        cargando.value = false
    }
})
</script>

<template>
    <div class="pagina-card">
        <div class="pagina-card-header">
            <span class="pagina-card-titulo">Reportes</span>
            <!-- Filtros de fecha globales -->
            <div class="filtros-fecha">
                <span class="filtro-label">Del</span>
                <DatePicker v-model="fechaDesde" dateFormat="yy-mm-dd" showIcon iconDisplay="input"
                            :style="{ width: '155px' }" />
                <span class="filtro-label">al</span>
                <DatePicker v-model="fechaHasta" dateFormat="yy-mm-dd" showIcon iconDisplay="input"
                            :style="{ width: '155px' }" />
                <Button label="Aplicar" icon="pi pi-search" size="small"
                        :loading="cargando" @click="aplicarFiltros" />
            </div>
        </div>

        <Tabs v-model:value="tabActiva">
            <TabList>
                <Tab value="resumen">Resumen</Tab>
                <Tab value="cobros">Cobros por mes</Tab>
                <Tab value="pendientes">Recibos pendientes</Tab>
                <Tab value="tramites">Trámites</Tab>
                <Tab value="sector">Por sector / categoría</Tab>
            </TabList>

            <TabPanels>

                <!-- ══════════ RESUMEN ══════════ -->
                <TabPanel value="resumen">
                    <div v-if="resumen" class="tarjetas-resumen">
                        <div class="tarjeta">
                            <div class="tarjeta-valor">{{ resumen.totalContratos }}</div>
                            <div class="tarjeta-label">Total contratos</div>
                        </div>
                        <div class="tarjeta tarjeta--verde">
                            <div class="tarjeta-valor">{{ resumen.contratosActivos }}</div>
                            <div class="tarjeta-label">Contratos activos</div>
                        </div>
                        <div class="tarjeta tarjeta--amarillo">
                            <div class="tarjeta-valor">{{ resumen.recibosPendientes }}</div>
                            <div class="tarjeta-label">Recibos pendientes</div>
                        </div>
                        <div class="tarjeta tarjeta--naranja">
                            <div class="tarjeta-valor">{{ resumen.tramitesPendientes }}</div>
                            <div class="tarjeta-label">Trámites pendientes</div>
                        </div>
                        <div class="tarjeta tarjeta--azul">
                            <div class="tarjeta-valor">${{ Number(resumen.montoCobradoMesActual).toFixed(2) }}</div>
                            <div class="tarjeta-label">Cobrado este mes</div>
                        </div>
                        <div class="tarjeta tarjeta--indigo">
                            <div class="tarjeta-valor">${{ Number(resumen.montoCobradoAnioActual).toFixed(2) }}</div>
                            <div class="tarjeta-label">Cobrado este año</div>
                        </div>
                    </div>
                    <div v-else class="cargando-txt">Cargando resumen...</div>

                    <!-- Mini gráficas en resumen -->
                    <div class="graficas-resumen" v-if="contratosPorEstado.length || tramitesPorEstado.length">
                        <div class="grafica-card" v-if="contratosPorEstado.length">
                            <h4>Contratos por estado</h4>
                            <Chart :key="`contratos-${chartVersion}`" type="pie" :data="chartContratos" :options="chartOpcionesPie" style="height:220px" />
                        </div>
                        <div class="grafica-card" v-if="tramitesPorEstado.length">
                            <h4>Trámites por estado</h4>
                            <Chart :key="`tram-est-${chartVersion}`" type="pie" :data="chartTramEstado" :options="chartOpcionesPie" style="height:220px" />
                        </div>
                    </div>
                </TabPanel>

                <!-- ══════════ COBROS POR MES ══════════ -->
                <TabPanel value="cobros">
                    <div class="tab-acciones">
                        <Button label="Excel" icon="pi pi-file-excel" size="small" severity="success" outlined
                                :disabled="!cobrosMes.length" @click="exportarCobrosExcel" />
                        <Button label="PDF" icon="pi pi-file-pdf" size="small" severity="danger" outlined
                                :disabled="!cobrosMes.length" @click="exportarCobrosPDF" />
                    </div>

                    <div v-if="cobrosMes.length">
                        <Chart :key="`cobros-${chartVersion}`" type="bar" :data="chartCobros" :options="chartOpcionesBarras" style="height:280px;margin-bottom:1.5rem" />
                        <DataTable :value="cobrosMes" stripedRows>
                            <Column header="Periodo">
                                <template #body="{ data }">{{ nombreMes(data.periodo) }}</template>
                            </Column>
                            <Column header="Total cobrado" style="text-align:right">
                                <template #body="{ data }">${{ Number(data.total).toFixed(2) }}</template>
                            </Column>
                        </DataTable>
                        <div class="total-row">
                            Total periodo: <strong>${{ cobrosMes.reduce((s,r) => s + Number(r.total), 0).toFixed(2) }}</strong>
                        </div>
                    </div>
                    <div v-else class="sin-datos">Sin cobros registrados en el periodo seleccionado.</div>
                </TabPanel>

                <!-- ══════════ RECIBOS PENDIENTES ══════════ -->
                <TabPanel value="pendientes">
                    <div class="tab-acciones">
                        <InputText v-model="filtroPendiente" placeholder="Buscar contrato, titular, sector..." size="small" style="width:280px" />
                        <Button label="Excel" icon="pi pi-file-excel" size="small" severity="success" outlined
                                :disabled="!pendientesFiltrados.length" @click="exportarPendientesExcel" />
                        <Button label="PDF" icon="pi pi-file-pdf" size="small" severity="danger" outlined
                                :disabled="!pendientesFiltrados.length" @click="exportarPendientesPDF" />
                    </div>

                    <DataTable :value="pendientesFiltrados" paginator :rows="15" stripedRows
                               emptyMessage="No hay recibos pendientes">
                        <Column field="numeroContrato"  header="Contrato"    style="width:130px" />
                        <Column field="titularNombre"   header="Titular"     />
                        <Column header="Periodo" style="width:110px">
                            <template #body="{ data }">{{ MESES[(data.mes||1)-1] }} {{ data.anio }}</template>
                        </Column>
                        <Column header="Monto" style="width:110px;text-align:right">
                            <template #body="{ data }">${{ Number(data.monto).toFixed(2) }}</template>
                        </Column>
                        <Column field="fechaVencimiento" header="Vencimiento" style="width:120px" />
                        <Column field="estadoNombre"     header="Estado"      style="width:110px">
                            <template #body="{ data }">
                                <span :class="data.estadoNombre?.toLowerCase().includes('vencido') ? 'tag-vencido' : 'tag-pendiente'">
                                    {{ data.estadoNombre }}
                                </span>
                            </template>
                        </Column>
                        <Column field="sectorNombre"     header="Sector"      />
                        <Column field="categoriaNombre"  header="Categoría"   />
                    </DataTable>
                    <div class="total-row" v-if="pendientesFiltrados.length">
                        Total pendiente: <strong>${{ totalPendiente.toFixed(2) }}</strong>
                        ({{ pendientesFiltrados.length }} recibos)
                    </div>
                </TabPanel>

                <!-- ══════════ TRÁMITES ══════════ -->
                <TabPanel value="tramites">
                    <div class="graficas-dos">
                        <div class="grafica-card" v-if="tramitesPorEstado.length">
                            <h4>Por estado</h4>
                            <Chart :key="`tram-est2-${chartVersion}`" type="pie" :data="chartTramEstado" :options="chartOpcionesPie" style="height:260px" />
                            <DataTable :value="tramitesPorEstado" class="tabla-chica" stripedRows>
                                <Column field="nombre"   header="Estado"   />
                                <Column field="cantidad" header="Cantidad" style="width:90px;text-align:right" />
                            </DataTable>
                        </div>
                        <div class="grafica-card" v-if="tramitesPorTipo.length">
                            <h4>Por tipo</h4>
                            <Chart :key="`tram-tip-${chartVersion}`" type="pie" :data="chartTramTipo" :options="chartOpcionesPie" style="height:260px" />
                            <DataTable :value="tramitesPorTipo" class="tabla-chica" stripedRows>
                                <Column field="nombre"   header="Tipo"     />
                                <Column field="cantidad" header="Cantidad" style="width:90px;text-align:right" />
                            </DataTable>
                        </div>
                    </div>
                    <div v-if="!tramitesPorEstado.length && !tramitesPorTipo.length" class="sin-datos">
                        Sin trámites registrados.
                    </div>
                </TabPanel>

                <!-- ══════════ POR SECTOR / CATEGORÍA ══════════ -->
                <TabPanel value="sector">
                    <div class="tab-acciones">
                        <Button label="Excel sector" icon="pi pi-file-excel" size="small" severity="success" outlined
                                :disabled="!ingresosSector.length" @click="exportarIngresosExcel" />
                        <Button label="PDF sector" icon="pi pi-file-pdf" size="small" severity="danger" outlined
                                :disabled="!ingresosSector.length" @click="exportarIngresosPDF" />
                    </div>

                    <div class="graficas-dos">
                        <div class="grafica-card" v-if="ingresosSector.length">
                            <h4>Ingresos por sector</h4>
                            <Chart :key="`sector-${chartVersion}`" type="bar" :data="chartSector" :options="chartOpcionesBarras" style="height:260px" />
                            <DataTable :value="ingresosSector" class="tabla-chica" stripedRows>
                                <Column field="nombre" header="Sector" />
                                <Column header="Total" style="width:130px;text-align:right">
                                    <template #body="{ data }">${{ Number(data.total).toFixed(2) }}</template>
                                </Column>
                            </DataTable>
                        </div>
                        <div class="grafica-card" v-if="ingresosCategoria.length">
                            <h4>Ingresos por categoría</h4>
                            <Chart :key="`categoria-${chartVersion}`" type="bar" :data="chartCategoria" :options="chartOpcionesBarras" style="height:260px" />
                            <DataTable :value="ingresosCategoria" class="tabla-chica" stripedRows>
                                <Column field="nombre" header="Categoría" />
                                <Column header="Total" style="width:130px;text-align:right">
                                    <template #body="{ data }">${{ Number(data.total).toFixed(2) }}</template>
                                </Column>
                            </DataTable>
                        </div>
                    </div>
                    <div v-if="!ingresosSector.length && !ingresosCategoria.length" class="sin-datos">
                        Sin datos de ingresos en el periodo seleccionado.
                    </div>
                </TabPanel>

            </TabPanels>
        </Tabs>
    </div>
</template>

<style scoped>
/* ── Filtros de fecha en header ── */
.filtros-fecha {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.filtro-label {
    font-size: 0.82rem;
    color: #6b7280;
    white-space: nowrap;
}

/* ── Tarjetas de resumen ── */
.tarjetas-resumen {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1.75rem;
}
.tarjeta {
    background: #f9fafb;
    border: 0.5px solid #e5e7eb;
    border-radius: 10px;
    padding: 1.1rem 1.25rem;
    text-align: center;
}
.tarjeta--verde   { background: #f0fdf4; border-color: #bbf7d0; }
.tarjeta--amarillo { background: #fefce8; border-color: #fef08a; }
.tarjeta--naranja  { background: #fff7ed; border-color: #fed7aa; }
.tarjeta--azul     { background: #eff6ff; border-color: #bfdbfe; }
.tarjeta--indigo   { background: #eef2ff; border-color: #c7d2fe; }
.tarjeta-valor {
    font-size: 1.6rem;
    font-weight: 700;
    color: #1a5276;
    line-height: 1.2;
}
.tarjeta-label {
    font-size: 0.78rem;
    color: #6b7280;
    margin-top: 0.25rem;
}

/* ── Gráficas ── */
.graficas-resumen,
.graficas-dos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
}
.grafica-card {
    border: 0.5px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem 1.25rem;
    background: #fafafa;
}
.grafica-card h4 {
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.75rem;
}

/* ── Acciones de tab ── */
.tab-acciones {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    justify-content: flex-end;
}

/* ── Tabla chica (dentro de grafica-card) ── */
.tabla-chica {
    margin-top: 0.75rem;
    font-size: 0.82rem;
}

/* ── Total ── */
.total-row {
    text-align: right;
    font-size: 0.85rem;
    color: #374151;
    padding: 0.6rem 1rem 0;
}

/* ── Sin datos ── */
.sin-datos, .cargando-txt {
    text-align: center;
    color: #9ca3af;
    padding: 2.5rem 0;
    font-size: 0.9rem;
}

@media (max-width: 900px) {
    .graficas-resumen,
    .graficas-dos { grid-template-columns: 1fr; }
    .tarjetas-resumen { grid-template-columns: repeat(2, 1fr); }
}
</style>
