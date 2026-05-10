<template>
  <div class="support-page max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold">Centrum podpory</h1>
      <p class="text-gray-500 mt-2">Odpovědi na nejčastější otázky a návod k použití aplikace</p>
    </div>

    <!-- Search -->
    <div class="mb-8">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        size="lg"
        placeholder="Vyhledat v nápovědě..."
        class="max-w-xl"
      />
    </div>

    <!-- Quick start cards -->
    <div v-if="!searchQuery" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
      <UCard
        v-for="card in quickStartCards"
        :key="card.title"
        class="hover:shadow-md transition-shadow cursor-pointer"
        @click="scrollToSection(card.sectionId)"
      >
        <div class="flex flex-col items-center text-center gap-3 py-2">
          <div class="w-12 h-12 rounded-full flex items-center justify-center" :class="card.bg">
            <component :is="card.icon" class="w-6 h-6" :class="card.color" />
          </div>
          <div>
            <p class="font-semibold">{{ card.title }}</p>
            <p class="text-sm text-gray-500 mt-1">{{ card.desc }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- FAQ sections -->
    <div class="space-y-8">
      <div
        v-for="section in filteredSections"
        :key="section.id"
        :id="section.id"
        class="scroll-mt-6"
      >
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="section.bg">
            <component :is="section.icon" class="w-4 h-4" :class="section.color" />
          </div>
          <h2 class="text-xl font-semibold">{{ section.title }}</h2>
        </div>

        <div class="space-y-3">
          <UCard
            v-for="(item, idx) in section.items"
            :key="idx"
            class="cursor-pointer"
            @click="toggleItem(section.id, idx)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <p class="font-medium">{{ item.q }}</p>
                <div v-if="isOpen(section.id, idx)" class="mt-3 text-gray-600 dark:text-gray-400 space-y-2">
                  <p v-for="(line, li) in item.a" :key="li" class="text-sm leading-relaxed">{{ line }}</p>
                  <div v-if="item.steps" class="mt-3 space-y-1">
                    <div
                      v-for="(step, si) in item.steps"
                      :key="si"
                      class="flex items-start gap-2 text-sm"
                    >
                      <span class="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {{ si + 1 }}
                      </span>
                      <span>{{ step }}</span>
                    </div>
                  </div>
                  <div v-if="item.tip" class="mt-3 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <LightBulbIcon class="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p class="text-xs text-amber-800 dark:text-amber-300">{{ item.tip }}</p>
                  </div>
                </div>
              </div>
              <ChevronDownIcon
                class="w-5 h-5 text-gray-400 transition-transform shrink-0 mt-0.5"
                :class="isOpen(section.id, idx) ? 'rotate-180' : ''"
              />
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <!-- No results -->
    <div v-if="searchQuery && filteredSections.length === 0" class="text-center py-16">
      <MagnifyingGlassIcon class="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p class="text-gray-500">Nic nebylo nalezeno pro "<strong>{{ searchQuery }}</strong>"</p>
      <UButton variant="ghost" class="mt-4" @click="searchQuery = ''">Zobrazit vše</UButton>
    </div>

    <!-- Contact -->
    <div v-if="!searchQuery" class="mt-12 p-6 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800 text-center">
      <h3 class="font-semibold text-lg mb-2">Nenašli jste odpověď?</h3>
      <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">Aplikace je neustále vyvíjena. Pokud narazíte na problém, obraťte se na správce projektu.</p>
      <NuxtLink to="/o-nas">
        <UButton variant="soft">Více o aplikaci</UButton>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  FolderIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ClockIcon,
  BellIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  TagIcon,
} from '@heroicons/vue/24/outline'

const searchQuery = ref('')
const openItems = ref<Record<string, boolean>>({})

function toggleItem(sectionId: string, idx: number) {
  const key = `${sectionId}-${idx}`
  openItems.value[key] = !openItems.value[key]
}

function isOpen(sectionId: string, idx: number) {
  return !!openItems.value[`${sectionId}-${idx}`]
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

const quickStartCards = [
  {
    title: 'Projekty',
    desc: 'Jak vytvořit a spravovat projekty',
    icon: FolderIcon,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    color: 'text-blue-600 dark:text-blue-400',
    sectionId: 'projekty'
  },
  {
    title: 'Úkoly',
    desc: 'Vytváření, přiřazování a sledování úkolů',
    icon: ClipboardDocumentListIcon,
    bg: 'bg-green-100 dark:bg-green-900/30',
    color: 'text-green-600 dark:text-green-400',
    sectionId: 'ukoly'
  },
  {
    title: 'Tým',
    desc: 'Pozvání členů a správa rolí',
    icon: UserGroupIcon,
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    color: 'text-purple-600 dark:text-purple-400',
    sectionId: 'tym'
  }
]

const sections = [
  {
    id: 'projekty',
    title: 'Projekty',
    icon: FolderIcon,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    color: 'text-blue-600',
    items: [
      {
        q: 'Jak vytvořit nový projekt?',
        a: ['Na hlavní stránce (Projekty) klikněte na tlačítko "Nový projekt" vpravo nahoře. Zadejte název projektu, vyberte barvu a potvrďte.'],
        steps: [
          'Přejděte na stránku Projekty (ikona složky v levém menu)',
          'Klikněte na tlačítko "+ Nový projekt" vpravo nahoře',
          'Zadejte název projektu',
          'Zvolte barvu projektu',
          'Klikněte na "Vytvořit"',
        ],
        tip: 'Projekt okamžitě zobrazí v levém menu pod záložkou Projekty.'
      },
      {
        q: 'Jak upravit nebo smazat projekt?',
        a: ['Otevřete projekt a klikněte na ikonu tužky (editace) nebo koše (smazání) vedle názvu projektu. Smazání projektu je nevratné — odstraní se i všechny úkoly a sprinty.'],
        tip: 'Smazat projekt může pouze jeho vlastník.'
      },
      {
        q: 'Jak nastavit barvu projektu?',
        a: ['Při vytváření projektu nebo v režimu úprav vyberte barvu z předdefinované palety. Barva se zobrazí jako tečka vedle názvu projektu v levém menu.'],
      },
      {
        q: 'Co je sprint a jak ho vytvořit?',
        a: ['Sprint je časově ohraničené období (typicky 1–4 týdny), ve kterém tým pracuje na konkrétním souboru úkolů. Každý projekt může mít více sprintů.'],
        steps: [
          'Otevřete projekt',
          'Přejděte na záložku "Sprinty"',
          'Klikněte na "+ Nový sprint"',
          'Zadejte název, datum zahájení a datum ukončení',
          'Potvrďte vytvoření',
        ],
      },
    ]
  },
  {
    id: 'ukoly',
    title: 'Úkoly',
    icon: ClipboardDocumentListIcon,
    bg: 'bg-green-100 dark:bg-green-900/30',
    color: 'text-green-600',
    items: [
      {
        q: 'Jak vytvořit nový úkol?',
        a: ['V otevřeném projektu klikněte na tlačítko "+ Přidat úkol" ve sloupci Backlog nebo libovolném jiném sloupci. Zadejte název úkolu a potvrďte.'],
        steps: [
          'Otevřete projekt',
          'Najděte sloupec, kde chcete úkol vytvořit',
          'Klikněte na ikonu "+" nebo "Přidat úkol" v dolní části sloupce',
          'Zadejte název úkolu',
          'Stiskněte Enter nebo klikněte na "Přidat"',
        ],
        tip: 'Kliknutím na kartu úkolu otevřete detail, kde lze nastavit popis, prioritu, body, štítky a přiřazení.'
      },
      {
        q: 'Jak přesunout úkol mezi sloupci?',
        a: ['Úkol přetáhněte myší (drag & drop) z jednoho sloupce do druhého. Sloupce odpovídají stavům: Backlog → Připraveno → Probíhá → Hotovo.'],
        tip: 'Stav úkolu se automaticky uloží do Firestore při přetažení.'
      },
      {
        q: 'Jak přiřadit úkol členovi týmu?',
        a: ['Otevřete detail úkolu kliknutím na kartu. V sekci "Přiřazeno" klikněte na pole a vyberte člena ze seznamu. Úkol bude viditelný ve filtru daného uživatele.'],
      },
      {
        q: 'Co jsou story pointy a jak je nastavit?',
        a: ['Story pointy (SP) jsou relativní odhad náročnosti úkolu. V detailu úkolu najdete pole "Story pointy" — zadejte číslo (typicky 1, 2, 3, 5, 8, 13). Celkový součet SP sprintu se zobrazí v reportech a burndown grafu.'],
        tip: 'Fibonacci řada (1, 2, 3, 5, 8, 13) je doporučená škála pro story pointy.'
      },
      {
        q: 'Jak přidat štítky (labels) k úkolu?',
        a: ['Otevřete detail úkolu a přejděte do režimu editace kliknutím na ikonu tužky. V sekci "Štítky" klikněte na barevné tlačítko s názvem štítku — tím ho přidáte nebo odeberete. Změny uložte tlačítkem "Uložit".'],
      },
      {
        q: 'Jak nastavit termín splnění (due date)?',
        a: ['V detailu úkolu v režimu editace najdete pole "Termín". Klikněte na kalendář a vyberte datum. Úkoly s blížícím se termínem zobrazí upozornění v zvonečku (ikoně notifikace) v horním menu.'],
        tip: 'Upozornění se zobrazí pro úkoly s termínem dnes nebo zítra.'
      },
      {
        q: 'Jak přidat komentář k úkolu?',
        a: ['Otevřete detail úkolu. V dolní části panelu najdete sekci "Komentáře". Napište text do pole a odešlete kliknutím na "Odeslat" nebo klávesou Enter.'],
      },
      {
        q: 'Jak přiložit soubor k úkolu?',
        a: ['V detailu úkolu najdete sekci "Přílohy". Klikněte na "Přidat přílohu" nebo přetáhněte soubor do označené oblasti. Soubory se ukládají do Firebase Storage.'],
        tip: 'Maximální velikost souboru je omezena pravidly Firebase Storage nastaveného projektu.'
      },
    ]
  },
  {
    id: 'tym',
    title: 'Tým a role',
    icon: UserGroupIcon,
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    color: 'text-purple-600',
    items: [
      {
        q: 'Jak pozvat nového člena do projektu?',
        a: ['Pozvat člena může vlastník projektu nebo admin. Otevřete projekt, přejděte na řádek s týmem a klikněte na "+ Přidat člena". Zadejte email uživatele — systém mu odešle pozvánkový email s odkazem.'],
        steps: [
          'Otevřete projekt',
          'Najděte sekci "Tým" v horní části projektu',
          'Klikněte na "+ Přidat člena"',
          'Zadejte email a vyberte roli (Člen nebo Admin)',
          'Klikněte na "Přidat" — pozvánka bude odeslána emailem',
        ],
        tip: 'Pokud email dorazí do spamu, odkaz lze zkopírovat ze schránky (systém ho tam automaticky uloží).'
      },
      {
        q: 'Jaké jsou role v projektu?',
        a: ['Aplikace rozlišuje tři úrovně přístupu:'],
        steps: [
          'Vlastník — vytvořil projekt, má plná práva, nemůže být odebrán',
          'Admin — může přidávat/odebírat členy, měnit role, upravovat projekt',
          'Člen — může pracovat s úkoly, přidávat komentáře, nahrávat přílohy',
        ],
      },
      {
        q: 'Jak změnit roli člena?',
        a: ['Vlastník nebo admin může kliknout na ikonu ozubeného kola (⚙️) vedle jména člena v řádku týmu a vybrat novou roli z nabídky.'],
      },
      {
        q: 'Jak odebrat člena z projektu?',
        a: ['V řádku týmu klikněte na ikonu "×" (křížek) vedle jména člena. Potvrdíte odebrání v dialogu. Odebrání je okamžité — člen ztratí přístup k projektu.'],
        tip: 'Vlastníka projektu nelze odebrat. Pokud chcete projekt předat, kontaktujte správce aplikace.'
      },
    ]
  },
  {
    id: 'reporty',
    title: 'Reporty a statistiky',
    icon: ChartBarIcon,
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    color: 'text-orange-600',
    items: [
      {
        q: 'Co zobrazuje stránka Reporty?',
        a: ['Stránka Reporty nabízí přehled aktivit a výkonnosti týmu. Obsahuje: celkový přehled úkolů, Graf aktivity (donut), Velocity graf (rychlost dokončování sprintů) a Burndown graf (průběh aktuálního sprintu).'],
      },
      {
        q: 'Co je Velocity graf?',
        a: ['Velocity graf zobrazuje, kolik story pointů tým dokončil v každém sprintu. Pomáhá odhadnout kapacitu týmu pro plánování budoucích sprintů. Čím vyšší a konzistentnější sloupce, tím předvídatelnější výkon týmu.'],
        tip: 'Průměrná velocity (červená čára) slouží jako referenční hodnota pro kapacitu sprintu.'
      },
      {
        q: 'Co je Burndown graf?',
        a: ['Burndown graf ukazuje, jak rychle tým "spaluje" (dokončuje) úkoly v aktuálním sprintu. Ideální linie jde rovnoměrně od celkového počtu SP na začátku sprintu k nule v den ukončení. Aktuální stav bodu ukazuje, zda jste před nebo za plánem.'],
        tip: 'Zelený bod = jste před plánem. Červený bod = jste za plánem.'
      },
      {
        q: 'Jak vybrat projekt pro zobrazení sprintových grafů?',
        a: ['Na stránce Reporty v sekci "Sprint metriky" najdete rozbalovací seznam projektů. Vyberte projekt a grafy se automaticky aktualizují pro sprinty daného projektu.'],
      },
    ]
  },
  {
    id: 'cas',
    title: 'Sledování času',
    icon: ClockIcon,
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    color: 'text-teal-600',
    items: [
      {
        q: 'Jak sledovat čas strávený na projektu?',
        a: ['V horním menu při otevřeném projektu najdete tlačítko "Spustit" s ikonou přehrávání. Kliknutím spustíte timer — ten měří čas od spuštění. Kliknutím na "Zastavit" se čas uloží do vašeho profilu.'],
        tip: 'Timer měří čas pro každého uživatele zvlášť na každém projektu zvlášť.'
      },
      {
        q: 'Kde se zobrazuje celkový čas?',
        a: ['Celkový strávený čas se zobrazuje přímo v headeru vedle tlačítka timer. Na stránce Aktivita vidíte přehled aktivity za všechny projekty.'],
      },
    ]
  },
  {
    id: 'notifikace',
    title: 'Notifikace a upozornění',
    icon: BellIcon,
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    color: 'text-yellow-600',
    items: [
      {
        q: 'Jak fungují upozornění na termíny?',
        a: ['Ikona zvonečku v horním menu zobrazuje upozornění na úkoly s termínem dnes nebo zítra. Kliknutím na zvoneček zobrazíte seznam blížících se termínů.'],
        tip: 'Upozornění se zobrazují pouze pro aktuálně otevřený projekt.'
      },
    ]
  },
  {
    id: 'bezpecnost',
    title: 'Zabezpečení a přihlášení',
    icon: ShieldCheckIcon,
    bg: 'bg-red-100 dark:bg-red-900/30',
    color: 'text-red-600',
    items: [
      {
        q: 'Jak se přihlásit do aplikace?',
        a: ['Klikněte na tlačítko "Přihlásit se" vpravo nahoře. Můžete se přihlásit emailem a heslem nebo účtem Google (OAuth). Při prvním přihlášení emailem je nutná registrace.'],
      },
      {
        q: 'Jak fungují pozvánky?',
        a: ['Pozvánkový odkaz je zabezpečen HMAC-SHA256 podpisem s 72hodinovou platností. Po kliknutí na odkaz v emailu budete přesměrováni do aplikace a automaticky přidáni do projektu.'],
        tip: 'Pokud platnost odkazu vyprší, požádejte vlastníka nebo admina projektu o nové pozvání.'
      },
      {
        q: 'Jsou moje data v bezpečí?',
        a: ['Všechna data jsou uložena v Google Firestore s definovanými bezpečnostními pravidly. Každý uživatel vidí pouze projekty, ve kterých je členem nebo vlastníkem. Přístupy jsou kontrolovány serverovými pravidly Firestore — nestačí znát ID projektu.'],
      },
    ]
  },
]

const filteredSections = computed(() => {
  if (!searchQuery.value.trim()) return sections
  const q = searchQuery.value.toLowerCase()
  return sections
    .map(section => ({
      ...section,
      items: section.items.filter(
        item =>
          item.q.toLowerCase().includes(q) ||
          item.a.some(line => line.toLowerCase().includes(q)) ||
          (item.steps || []).some(s => s.toLowerCase().includes(q))
      )
    }))
    .filter(section => section.items.length > 0)
})
</script>

<style scoped>
.support-page {
  padding-bottom: 4rem;
}
</style>
