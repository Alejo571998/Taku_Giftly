import { interestLabel, occasionLabel } from "@/lib/catalog";
import { computeAvoidancePenalty, relatedInterests } from "@/lib/scoring/compatibility-score";
import type {
  GiftCandidate,
  GiftSessionInput,
  GiftType,
} from "@/lib/types";

export interface MockOption {
  name: string;
  category: string;
  description: string;
  whyItFits: string;
  tags: string[];
  estimatedPrice: number;
  giftType: GiftType;
  pros: string[];
  cons: string[];
  keywords: string[];
  /** Solo tiene sentido para estas relaciones (ej. planes románticos). */
  onlyFor?: string[];
}

interface MockTemplate {
  id: string;
  matchInterests: string[];
  matchRelationships: string[];
  matchAgeRanges: string[];
  hintKeywords: string[];
  options: MockOption[];
}

const GAMING_TEMPLATE: MockTemplate = {
  id: "gaming",
  matchInterests: ["gaming", "videojuegos", "tecnologia"],
  matchRelationships: ["hermano", "hijo", "amigo", "pareja"],
  matchAgeRanges: ["menor18", "18-24", "25-34"],
  hintKeywords: ["auricular", "juego", "play", "pc", "consola", "gaming"],
  options: [
    {
      name: "Auriculares gamer inalámbricos",
      category: "gaming",
      description:
        "Auriculares inalámbricos con sonido envolvente y micrófono con cancelación de ruido. Pensados para jugar sin cables y escuchar cada detalle.",
      whyItFits:
        "Es la pista más directa que te dio: quiere auriculares nuevos. Con estos va a poder jugar, llamar y escuchar música con una calidad que no tiene hoy.",
      tags: ["gaming", "tecnologia", "musica"],
      estimatedPrice: 185000,
      giftType: "physical",
      pros: [
        "Sonido envolvente que mejora la experiencia de juego",
        "Inalámbricos: más comodidad y menos cables",
        "Sirve también para música y videollamadas",
      ],
      cons: [
        "La batería hay que cargarla cada varias horas",
        "Marca y modelo pueden variar según disponibilidad",
      ],
      keywords: ["auricular", "auriculares", "headset", "audio", "sonido"],
    },
    {
      name: "Gift card PlayStation Store",
      category: "videojuegos",
      description:
        "Saldo para que compre el juego que quiera en la PlayStation Store, sin riesgo de regalarle algo que ya tiene.",
      whyItFits:
        "Le encanta jugar, pero adivinar cuál es el próximo juego que quiere es difícil. Con una gift card le das poder de decisión y la seguridad de que va a usarla.",
      tags: ["videojuegos", "gaming"],
      estimatedPrice: 50000,
      giftType: "giftcard",
      pros: [
        "Imposible errar: elige a su gusto",
        "Se puede combinar con otro regalo",
        "Sirve para DLC, juegos y contenido extra",
      ],
      cons: [
        "Menos 'sorpresa' que un regalo físico",
        "Solo sirve en PlayStation Store",
      ],
      keywords: ["play", "psn", "juego", "gift card", "saldo"],
    },
    {
      name: "Control inalámbrico para consola",
      category: "gaming",
      description:
        "Un control adicional para jugar en pareja o de repuesto cuando el principal se queda sin batería.",
      whyItFits:
        "Combina con su pasión por los juegos y es un regalo práctico que siempre suma: nunca sobra un control de repuesto.",
      tags: ["gaming", "videojuegos", "tecnologia"],
      estimatedPrice: 120000,
      giftType: "physical",
      pros: [
        "Ideal para jugar de a dos",
        "Repuesto útil cuando el control principal falla",
        "Compatibilidad amplia con la consola",
      ],
      cons: [
        "Hay que verificar compatibilidad con su consola",
        "Puede que ya tenga uno extra",
      ],
      keywords: ["control", "joystick", "mando", "gamepad"],
    },
    {
      name: "Soporte para auriculares con cargador",
      category: "tecnologia",
      description:
        "Un soporte de escritorio que sostiene los auriculares y además carga el teléfono o el control de forma inalámbrica.",
      whyItFits:
        "Complementa la pista de los auriculares: un lugar para tenerlos siempre a mano y ordenados en su setup de escritorio.",
      tags: ["tecnologia", "gaming"],
      estimatedPrice: 45000,
      giftType: "physical",
      pros: [
        "Ordena el escritorio y cuida los auriculares",
        "Incluye carga inalámbrica práctica",
        "Precio accesible para sumar al regalo principal",
      ],
      cons: [
        "Es un complemento, no el regalo estrella",
        "Carga inalámbrica limitada a dispositivos compatibles",
      ],
      keywords: ["soporte", "auricular", "escritorio", "cargador"],
    },
    {
      name: "Alfombrilla gamer XL retroiluminada",
      category: "gaming",
      description:
        "Una alfombrilla de escritorio extragrande con iluminación RGB que cubre teclado y mouse para un setup más cómodo y con estilo.",
      whyItFits:
        "Le da el toque final a su espacio de juego y se suma a su interés por la tecnología y el gaming a un precio muy razonable.",
      tags: ["gaming", "tecnologia"],
      estimatedPrice: 80000,
      giftType: "physical",
      pros: [
        "Más comodidad y superficie para mouse y teclado",
        "Iluminación configurable que acompaña el setup",
        "Regalo con buena relación precio-beneficio",
      ],
      cons: [
        "Depende del gusto estético de cada persona",
        "Requiere puerto USB para la luz",
      ],
      keywords: ["alfombrilla", "mousepad", "setup", "escritorio"],
    },
  ],
};

const PADRE_TEMPLATE: MockTemplate = {
  id: "padre",
  matchInterests: ["deportes", "cocina", "gastronomia", "futbol", "autos"],
  matchRelationships: ["padre", "madre", "companiero", "amigo"],
  matchAgeRanges: ["45-54", "55-64", "65+"],
  hintKeywords: ["parrilla", "asado", "cocinar", "futbol", "fútbol", "cocina", "herramienta", "mate"],
  options: [
    {
      name: "Kit parrillero profesional",
      category: "cocina",
      description:
        "Set completo de herramientas para la parrilla: pinzas, espátula, cepillo y guantes resistentes al calor, con bolso de transporte.",
      whyItFits:
        "El otro día dijo que quería algo nuevo para la parrilla: esta es la respuesta directa a esa pista. Es práctico, se usa cada fin de semana y demuestra que lo escuchaste.",
      tags: ["cocina", "gastronomia", "otros"],
      estimatedPrice: 155000,
      giftType: "physical",
      pros: [
        "Responde exactamente a lo que dijo que quería",
        "Se usa seguido, no termina en un cajón",
        "Buena relación calidad-precio en el rango que elegiste",
      ],
      cons: [
        "Puede que ya tenga herramientas similares",
        "Es un regalo más práctico que emotivo",
      ],
      keywords: ["parrilla", "parrillero", "asado", "fuego"],
    },
    {
      name: "Experiencia gastronómica para dos",
      category: "experiencias",
      description:
        "Un menú de degustación en un restaurante de cocina argentina de primer nivel, para compartir una velada especial.",
      whyItFits:
        "Le gusta la gastronomía y compartir: una experiencia suma recuerdos que un objeto no puede. Es el regalo ideal para alguien que ya tiene de todo en la cocina.",
      tags: ["gastronomia", "experiencias", "cocina"],
      estimatedPrice: 180000,
      giftType: "experience",
      pros: [
        "Genera un recuerdo, no un objeto más",
        "Ideal para celebrar su cumpleaños como merece",
        "Se adapta al presupuesto medio que definiste",
      ],
      cons: [
        "Requiere reservar fecha",
        "Depende de su disponibilidad y del lugar elegido",
      ],
      keywords: ["cena", "restaurante", "degustación", "degustacion", "gastronomia", "comer"],
    },
    {
      name: "Camiseta de fútbol personalizada",
      category: "deportes",
      description:
        "La camiseta de su equipo favorito con su nombre y número preferido en la espalda, preparada especialmente para esa persona.",
      whyItFits:
        "El fútbol es una de sus pasiones y una camiseta con su nombre es un regalo personal y emocional que no se consigue en cualquier lado.",
      tags: ["deportes", "otros"],
      estimatedPrice: 95000,
      giftType: "physical",
      pros: [
        "Personalización que la hace única",
        "Apunta directo a su pasión por el fútbol",
        "Se puede usar tanto en la cancha como en casa",
      ],
      cons: [
        "Hay que conocer bien qué equipo y qué talla usa",
        "Originales oficiales pueden superar el presupuesto",
      ],
      keywords: ["camiseta", "futbol", "fútbol", "equipo", "club", "remera"],
    },
    {
      name: "Set de cuchillos de chef",
      category: "cocina",
      description:
        "Un set de cuchillos de acero inoxidable con soporte de madera, para cocinar con precisión y cuidar cada preparación.",
      whyItFits:
        "Combina su gusto por la cocina con un objeto que se usa todos los días. Un buen cuchillo cambia la experiencia de cocinar.",
      tags: ["cocina", "gastronomia"],
      estimatedPrice: 110000,
      giftType: "physical",
      pros: [
        "Uso cotidiano garantizado",
        "Material de calidad que dura años",
        "Encaja dentro del presupuesto",
      ],
      cons: [
        "Requiere mantenimiento y afilado",
        "Si ya tiene uno bueno, puede resultar repetido",
      ],
      keywords: ["cuchillo", "cocina", "chef", "cuchillos", "cortar"],
    },
    {
      name: "Experiencia deportiva: entradas para su equipo",
      category: "experiencias",
      description:
        "Dos entradas para ver a su equipo en la cancha, para que viva el partido en persona en lugar de mirarlo por televisión.",
      whyItFits:
        "Le apasiona el fútbol y nada supera la experiencia en vivo. Compartir ese momento convierte el regalo en un plan.",
      tags: ["deportes", "experiencias"],
      estimatedPrice: 140000,
      giftType: "experience",
      pros: [
        "Experiencia emocional difícil de superar",
        "Incluye un plan compartido",
        "Flexible según el partido que elijan",
      ],
      cons: [
        "Depende del calendario y la disponibilidad de entradas",
        "El precio varía según el partido y la ubicación",
      ],
      keywords: ["entrada", "partido", "cancha", "estadio", "futbol", "fútbol", "equipo"],
    },
  ],
};

const PAREJA_TEMPLATE: MockTemplate = {
  id: "pareja",
  matchInterests: ["viajes", "fotografia", "experiencias", "arte", "musica"],
  matchRelationships: ["pareja", "amigo", "companiero"],
  matchAgeRanges: ["25-34", "35-44", "45-54"],
  hintKeywords: ["viaje", "viajar", "foto", "fotos", "cena", "escapada", "aniversario"],
  options: [
    {
      name: "Escapada romántica de fin de semana",
      category: "experiencias",
      description:
        "Una escapada para dos a una posada o estancia con desayuno incluido, para celebrar la ocasión lejos de la rutina.",
      whyItFits:
        "Les encanta viajar y compartir momentos: una escapada convierte el aniversario en un recuerdo inolvidable, mucho más valioso que cualquier objeto.",
      tags: ["viajes", "experiencias", "fotografia"],
      estimatedPrice: 200000,
      giftType: "experience",
      pros: [
        "Recuerdo imborrable para la pareja",
        "Conecta con sus gustos por viajar y fotografiar",
        "Se celebra la ocasión como corresponde",
      ],
      cons: [
        "Requiere coordinar fechas y reservar con anticipación",
        "Puede superar un presupuesto ajustado",
      ],
      keywords: ["escapada", "viaje", "posada", "estancia", "romantico", "romántico", "finde"],
      onlyFor: ["pareja"],
    },
    {
      name: "Álbum de fotos personalizado",
      category: "fotografia",
      description:
        "Un álbum impreso con los mejores momentos de ustedes, editado y armado a medida con las fotos que más les gusten.",
      whyItFits:
        "Aprovecha su pasión por la fotografía y transforma momentos digitales que nadie vuelve a mirar en un objeto tangible para revivir siempre.",
      tags: ["fotografia", "arte"],
      estimatedPrice: 52000,
      giftType: "physical",
      pros: [
        "Altamente personal y emocional",
        "Precio accesible dentro de cualquier presupuesto",
        "Se puede hacer online desde casa",
      ],
      cons: [
        "Hay que juntar y seleccionar las fotos",
        "Demora unos días en imprimirse",
      ],
      keywords: ["album", "álbum", "foto", "fotos", "recuerdo", "impresion", "impresión"],
      onlyFor: ["pareja"],
    },
    {
      name: "Cámara instantánea",
      category: "fotografia",
      description:
        "Una cámara instantánea que imprime la foto al momento, ideal para llevar a los viajes y registrar momentos al instante.",
      whyItFits:
        "Une sus dos mundos: viajar y fotografiar. La foto física al instante le da un toque lúdico y analógico a su hobby.",
      tags: ["fotografia", "tecnologia", "viajes"],
      estimatedPrice: 160000,
      giftType: "physical",
      pros: [
        "Combinación perfecta de sus intereses",
        "Ideal para viajes y reuniones",
        "Resultado tangible e inmediato",
      ],
      cons: [
        "Los cartuchos de fotos tienen costo recurrente",
        "Calidad de imagen limitada vs. una cámara digital",
      ],
      keywords: ["camara", "cámara", "instantanea", "instantánea", "foto", "polaroid"],
    },
    {
      name: "Set de viaje compacto",
      category: "viajes",
      description:
        "Organizador de equipaje, neceser de silicona y adaptador universal: todo lo que necesitan para viajar ordenado y sin perder nada.",
      whyItFits:
        "Práctico para sus planes de viajar: cada vez que armen la valija, van a pensar en el regalo. Pensado para quienes aman moverse.",
      tags: ["viajes", "otros"],
      estimatedPrice: 130000,
      giftType: "physical",
      pros: [
        "Uso asegurado en cada viaje",
        "Conjunto completo en un solo regalo",
        "Ideal para regalar en pareja",
      ],
      cons: [
        "Menos emocional que una experiencia",
        "El tamaño y diseño pueden variar según marca",
      ],
      keywords: ["viaje", "equipaje", "valija", "organizador", "adaptador"],
    },
    {
      name: "Cena especial a la luz de las velas",
      category: "gastronomia",
      description:
        "Una cena armada para dos en un restaurante con ambiente íntimo, con menú maridaje y postre sorpresa incluidos.",
      whyItFits:
        "Para celebrar la ocasión con la persona que elegiste: un plan íntimo que combina su gusto por la gastronomía y el momento especial que están viviendo.",
      tags: ["gastronomia", "experiencias", "cocina"],
      estimatedPrice: 120000,
      giftType: "experience",
      pros: [
        "Ambiente íntimo ideal para la ocasión",
        "Menú pensado de principio a fin",
        "Se adapta al presupuesto",
      ],
      cons: [
        "Requiere reservar con anticipación",
        "Depende del lugar y la disponibilidad",
      ],
      keywords: ["cena", "velas", "romantico", "romántico", "restaurante", "aniversario"],
      onlyFor: ["pareja"],
    },
  ],
};

const GENERIC_TEMPLATE: MockTemplate = {
  id: "generico",
  matchInterests: [],
  matchRelationships: [],
  matchAgeRanges: [],
  hintKeywords: [],
  options: [
    {
      name: "Experiencia original para sorprender",
      category: "experiencias",
      description:
        "Una actividad única pensada según sus gustos: puede ser una cata, un taller, una salida especial o algo que siempre quiso probar.",
      whyItFits:
        "Cuando no hay pistas claras, una experiencia bien elegida es el regalo más seguro: genera recuerdos y se adapta a lo que sabés que le gusta.",
      tags: ["experiencias", "otros"],
      estimatedPrice: 150000,
      giftType: "experience",
      pros: [
        "Se adapta a cualquier persona y ocasión",
        "Genera recuerdos, no acumula cosas",
        "Se coordina después, cuando elegís fecha",
      ],
      cons: [
        "Requiere saber qué actividad le puede gustar",
        "Menos 'objeto' que un regalo físico",
      ],
      keywords: ["experiencia", "actividad", "salida", "plan", "taller"],
    },
    {
      name: "Gift card de su tienda favorita",
      category: "otros",
      description:
        "Saldo precargado en la tienda o servicio que más usa, para que elija exactamente lo que necesita sin presión.",
      whyItFits:
        "Cuando no hay pistas, regalar poder de elección es la jugada inteligente: cero riesgo de equivocarse y la persona elige con calma.",
      tags: ["otros"],
      estimatedPrice: 40000,
      giftType: "giftcard",
      pros: [
        "Imposible equivocarse",
        "Sirve como regalo base para combinar",
        "Sin riesgo de duplicar lo que ya tiene",
      ],
      cons: [
        "Menos emocional que un regalo pensado",
        "Depende de la tienda elegida",
      ],
      keywords: ["gift card", "tarjeta", "saldo", "cupon", "cupón"],
    },
    {
      name: "Accesorio para su hobby",
      category: "otros",
      description:
        "Un accesorio de calidad relacionado con su hobby principal: deporte, música, tecnología o lo que más le apasione.",
      whyItFits:
        "Cualquier persona con un hobby valora herramientas que mejoren su práctica. Elegimos el accesorio según el hobby que nos marcaste en el wizard.",
      tags: ["otros"],
      estimatedPrice: 100000,
      giftType: "physical",
      pros: [
        "Se adapta al hobby que contaste",
        "Mejora su práctica favorita",
        "Rango de precio flexible",
      ],
      cons: [
        "Hay que conocer bien su hobby",
        "Menos sorprendente que una experiencia",
      ],
      keywords: ["hobby", "accesorio", "equipo"],
    },
  ],
};

const ESTILO_TEMPLATE: MockTemplate = {
  id: "estilo",
  matchInterests: ["belleza", "moda", "musica", "arte", "fitness", "cine", "autos", "libros", "viajes"],
  matchRelationships: ["madre", "padre", "pareja", "amigo", "hermano", "hijo", "companiero", "otro"],
  matchAgeRanges: [],
  hintKeywords: [],
  options: [
    {
      name: "Kit de spa y cuidado facial",
      category: "belleza",
      description:
        "Set de cuidado con limpiador, sérum, crema hidratante y máscara facial, en un estuche lindo para regalar.",
      whyItFits:
        "Le gusta cuidarse: un ritual de spa en casa es un mimo que se usa todos los días y se disfruta sin apuro.",
      tags: ["belleza"],
      estimatedPrice: 70000,
      giftType: "physical",
      pros: ["Se usa a diario", "Fácil de regalar y de recibir"],
      cons: ["Conviene saber su tipo de piel"],
      keywords: ["spa", "piel", "crema", "facial", "cuidado", "relajar"],
    },
    {
      name: "Parlante bluetooth resistente al agua",
      category: "musica",
      description:
        "Parlante portátil con buen sonido, batería de larga duración y resistencia al agua para llevar a todos lados.",
      whyItFits:
        "La música lo acompaña siempre: un parlante portátil suma a cada momento, en casa, en el patio o de viaje.",
      tags: ["musica", "tecnologia"],
      estimatedPrice: 90000,
      giftType: "physical",
      pros: ["Uso diario", "Sirve en casa y afuera"],
      cons: ["Si ya tiene uno bueno, puede repetirse"],
      keywords: ["parlante", "musica", "música", "escuchar", "bluetooth"],
    },
    {
      name: "Taller de cerámica o pintura",
      category: "arte",
      description:
        "Una clase o taller presencial de cerámica o pintura, con materiales incluidos, para crear algo con sus manos.",
      whyItFits:
        "Le atrae el arte: un taller le da una experiencia distinta y se lleva algo hecho por sí mismo.",
      tags: ["arte", "experiencias"],
      estimatedPrice: 80000,
      giftType: "experience",
      pros: ["Experiencia + recuerdo tangible", "Ideal para desconectar"],
      cons: ["Hay que coordinar fecha"],
      keywords: ["ceramica", "cerámica", "pintar", "pintura", "taller", "manualidades"],
    },
    {
      name: "Kit de entrenamiento en casa",
      category: "fitness",
      description:
        "Bandas de resistencia, mat antideslizante y botella térmica para entrenar en casa o al aire libre.",
      whyItFits:
        "Le gusta moverse: con este kit entrena donde quiera, sin depender del gimnasio.",
      tags: ["fitness", "deportes"],
      estimatedPrice: 85000,
      giftType: "physical",
      pros: ["Práctico y versátil", "Ocupa poco lugar"],
      cons: ["Si va al gimnasio, quizás ya tenga equipamiento"],
      keywords: ["gimnasio", "gym", "entrenar", "yoga", "correr", "pilates"],
    },
    {
      name: "Billetera de cuero artesanal",
      category: "moda",
      description:
        "Billetera de cuero hecha a mano, con terminaciones prolijas, que mejora con el uso.",
      whyItFits:
        "Le importa vestirse bien: un accesorio de cuero de calidad se usa todos los días y dura años.",
      tags: ["moda"],
      estimatedPrice: 60000,
      giftType: "physical",
      pros: ["Clásico que no pasa de moda", "Uso diario"],
      cons: ["Es una elección de estilo personal"],
      keywords: ["billetera", "cuero", "cinturon", "cinturón", "cartera"],
    },
    {
      name: "Suscripción a una plataforma de streaming",
      category: "cine",
      description:
        "Varios meses de una plataforma de series y películas, para ver lo que quiera cuando quiera.",
      whyItFits:
        "Disfruta del cine y las series: varios meses de catálogo son planes asegurados para muchas noches.",
      tags: ["cine"],
      estimatedPrice: 30000,
      giftType: "service",
      pros: ["Se aprovecha durante meses", "Llega al instante"],
      cons: ["Puede que ya tenga esa plataforma"],
      keywords: ["serie", "series", "peli", "pelicula", "película", "streaming", "netflix"],
    },
    {
      name: "Libro de cocina de autor",
      category: "libros",
      description:
        "Un libro de recetas de un cocinero reconocido, con fotos y técnicas para animarse a platos nuevos.",
      whyItFits:
        "Une dos cosas que disfruta, leer y cocinar: inspiración para probar recetas nuevas en casa.",
      tags: ["libros", "cocina", "gastronomia"],
      estimatedPrice: 40000,
      giftType: "physical",
      pros: ["Se usa una y otra vez", "Lindo objeto para la cocina"],
      cons: ["Conviene elegir un estilo de cocina que le guste"],
      keywords: ["receta", "recetas", "libro", "cocinar"],
    },
    {
      name: "Kit de limpieza y detailing para el auto",
      category: "autos",
      description:
        "Shampoo, cera, microfibras y aromatizante para dejar el auto impecable por dentro y por fuera.",
      whyItFits:
        "Cuida su auto con dedicación: un kit completo de detailing es un regalo práctico que va a usar seguido.",
      tags: ["autos"],
      estimatedPrice: 75000,
      giftType: "physical",
      pros: ["Muy práctico", "Se nota el resultado"],
      cons: ["Si lo lleva a lavar, puede que no lo use"],
      keywords: ["auto", "coche", "lavar", "limpieza", "cera"],
    },
    {
      name: "Planta de interior con maceta de diseño",
      category: "arte",
      description:
        "Una planta de interior fácil de cuidar en una maceta de cerámica de diseño, lista para decorar.",
      whyItFits:
        "Le gustan las cosas lindas para su casa: una planta en una buena maceta decora y se cuida sola.",
      tags: ["arte", "otros"],
      estimatedPrice: 45000,
      giftType: "physical",
      pros: ["Decora y dura", "Fácil de cuidar"],
      cons: ["Necesita un poco de luz"],
      keywords: ["planta", "plantas", "jardin", "jardín", "maceta", "deco"],
    },
    {
      name: "Mochila de viaje de cabina",
      category: "viajes",
      description:
        "Mochila con medidas de cabina, compartimento para notebook y apertura tipo valija.",
      whyItFits:
        "Le encanta viajar: una mochila pensada para avión hace cada escapada más cómoda.",
      tags: ["viajes", "moda"],
      estimatedPrice: 110000,
      giftType: "physical",
      pros: ["Evita pagar valija", "Sirve también para el día a día"],
      cons: ["Si viaja con valija grande, la usará menos"],
      keywords: ["mochila", "viaje", "valija", "equipaje", "avion", "avión"],
    },
    {
      name: "Kit de café de especialidad",
      category: "cafe",
      description:
        "Café de especialidad en grano, molinillo manual y una taza de diseño, para empezar el día con un rito propio.",
      whyItFits:
        "El café es un placer cotidiano que casi nadie se regala a sí mismo. Un kit bien armado convierte el arranque del día en un momento especial.",
      tags: ["cafe", "gastronomia"],
      estimatedPrice: 60000,
      giftType: "physical",
      pros: [
        "Regalo seguro para amantes del café",
        "Precio accesible y con mucha calidad percibida",
        "Se usa todos los días",
      ],
      cons: [
        "Solo le gusta si es cafetero",
        "El molinillo manual requiere algo de práctica",
      ],
      keywords: ["cafe", "café", "molinillo", "taza", "granos"],
    },
    {
      name: "Libro elegido a medida",
      category: "libros",
      description:
        "Un libro elegido a partir de sus géneros favoritos, con dedicatoria personalizada en la primera página.",
      whyItFits:
        "Un libro bien elegido dice 'te conozco'. Con tu ayuda armamos una selección corta de títulos según sus lecturas y género preferido.",
      tags: ["libros", "arte"],
      estimatedPrice: 45000,
      giftType: "service",
      pros: [
        "Altamente personal con la dedicatoria",
        "Regalo íntimo y con contenido real",
        "Precio accesible",
      ],
      cons: [
        "Riesgo de que ya lo haya leído",
        "Hay que conocer bien sus gustos de lectura",
      ],
      keywords: ["libro", "lectura", "novela", "leer"],
    },
  ],
};

const TEMPLATES: MockTemplate[] = [
  GAMING_TEMPLATE,
  PADRE_TEMPLATE,
  PAREJA_TEMPLATE,
  ESTILO_TEMPLATE,
  GENERIC_TEMPLATE,
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function hintMatches(hint: string, keywords: string[], name: string): boolean {
  if (!hint) return false;
  const hintTokens = new Set(tokenize(hint));
  const haystack = tokenize(hint).join(" ");
  const nameTokens = tokenize(name).map((t) => t.toLowerCase()).join(" ");
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    if (haystack.includes(k) || hintTokens.has(k)) return true;
  }
  return nameTokens.length > 0 && haystack.includes(nameTokens);
}

function priceForBands(base: number, budgetMin: number | null, budgetMax: number | null, index: number, total: number): number {
  // AGENTS.md §8 no existe; bandas inferidas: distribuir precios uniformemente dentro del presupuesto.
  if (budgetMin != null && budgetMax != null && budgetMax > budgetMin) {
    // Con mínimo 0 ("hasta $X") no tiene sentido proponer regalos de $5.000.
    const lo = budgetMin > 0 ? budgetMin : Math.round(budgetMax * 0.4);
    const span = budgetMax - lo;
    const band = lo + Math.round((span * (index + 0.5)) / total);
    return Math.round(Math.max(lo, Math.min(budgetMax, band)) / 1000) * 1000;
  }
  if (budgetMax != null && budgetMax > 0) {
    const ratios = [0.5, 0.7, 0.85, 0.92, 0.65];
    return Math.round((budgetMax * (ratios[index] ?? 0.75)) / 1000) * 1000;
  }
  if (budgetMin != null && budgetMin > 0) {
    return Math.round((budgetMin * (1 + index * 0.15)) / 1000) * 1000;
  }
  return base;
}

/** Frases de los mocks que asumen una pista que el usuario quizás no dio. */
const HINT_CLAIM = /pista|dijo|coment|mencion|quiere |quería|pidió/i;

/**
 * Explicación honesta: solo usa datos que el usuario cargó. Si la plantilla
 * asumía una pista que no existe, se reemplaza por una razón basada en gustos.
 */
function honestReason(
  option: MockOption,
  input: GiftSessionInput,
  matchesHint: boolean
): string {
  const hint = input.recentHints.trim();
  if (matchesHint && hint) {
    return `Responde a la pista que nos diste: “${hint}”. ${option.description}`;
  }
  if (!HINT_CLAIM.test(option.whyItFits)) return option.whyItFits;

  const matched = input.interests
    .filter((i) => option.tags.includes(i.toLowerCase()))
    .map((i) => interestLabel(i).toLowerCase());
  const likes = matched.length > 0 ? matched.join(" y ") : interestLabel(input.interests[0] ?? "otros").toLowerCase();
  const occasion = occasionLabel(input.occasion);
  return `Va directo a su gusto por ${likes}${occasion ? ` y es un buen regalo para ${occasion.toLowerCase()}` : ""}. ${option.description}`;
}

interface ScoredOption {
  option: MockOption;
  template: MockTemplate;
  score: number;
  matchesHint: boolean;
  /** Coincide directo con un gusto o responde a la pista. */
  strong: boolean;
}

/** Puntaje de una idea para esta persona (modo demo). */
function scoreOption(
  option: MockOption,
  template: MockTemplate,
  input: GiftSessionInput
): ScoredOption | null {
  if (option.onlyFor && !option.onlyFor.includes(input.recipientRelationship)) return null;
  if (computeAvoidancePenalty(option.name, option.category, option.tags, input.thingsToAvoid) > 0) {
    return null;
  }
  // "otros" no es un gusto concreto: no cuenta como coincidencia.
  const interests = input.interests.map((i) => i.toLowerCase()).filter((i) => i !== "otros");
  const direct = option.tags.filter((t) => t !== "otros" && interests.includes(t)).length;
  const related =
    direct === 0 &&
    interests.some((i) => relatedInterests(i).some((r) => option.tags.includes(r)));
  const isGeneric = template.id === "generico";
  const matchesHint = !isGeneric && hintMatches(input.recentHints ?? "", option.keywords, option.name);

  let score = direct * 3 + (related ? 1 : 0) + (matchesHint ? 4 : 0);
  if (template.matchRelationships.includes(input.recipientRelationship)) score += 0.5;
  if (template.matchAgeRanges.includes(input.ageRange)) score += 0.25;
  // Se prioriza lo que entra en el presupuesto (sin cambiar su precio).
  const price = option.estimatedPrice;
  if (input.budgetMax != null && price > input.budgetMax * 1.25) score -= 2;
  if (input.budgetMin != null && input.budgetMin > 0 && price < input.budgetMin * 0.5) score -= 1;
  return { option, template, score, matchesHint, strong: direct > 0 || matchesHint };
}

/**
 * Modo demo: elige idea por idea del catálogo según gustos, pistas y
 * relación (no una plantilla fija), con variedad de categorías. Si no
 * alcanzan las relevantes, completa con ideas genéricas.
 */
export function buildMockCandidates(
  input: GiftSessionInput,
  exclude: string[] = []
): GiftCandidate[] {
  const excluded = new Set(exclude.map((n) => n.toLowerCase()));
  const seen = new Set<string>();
  const pool: ScoredOption[] = [];
  for (const template of TEMPLATES) {
    for (const option of template.options) {
      const key = option.name.toLowerCase();
      if (excluded.has(key) || seen.has(key)) continue;
      seen.add(key);
      const scored = scoreOption(option, template, input);
      if (scored) pool.push(scored);
    }
  }

  const byScore = (a: ScoredOption, b: ScoredOption) => b.score - a.score;
  const specific = pool.filter((s) => s.template.id !== "generico");
  const strong = specific.filter((s) => s.strong).sort(byScore);
  // Ideas "primas" (intereses relacionados): solo para completar.
  const weak = specific.filter((s) => !s.strong && s.score >= 1).sort(byScore);
  // Genéricas: primero las abiertas (eligen a su gusto), después las de nicho.
  const OPEN_FIRST = ["giftcard", "experience", "service", "physical"];
  const generic = pool
    .filter((s) => s.template.id === "generico")
    .sort((a, b) => OPEN_FIRST.indexOf(a.option.giftType) - OPEN_FIRST.indexOf(b.option.giftType));

  // Variedad: como mucho 2 ideas de la misma categoría.
  const picked: ScoredOption[] = [];
  const perCategory = new Map<string, number>();
  for (const s of strong) {
    if (picked.length >= 5) break;
    const used = perCategory.get(s.option.category) ?? 0;
    if (used >= 2) continue;
    perCategory.set(s.option.category, used + 1);
    picked.push(s);
  }
  for (const s of [...weak, ...generic]) {
    if (picked.length >= 3) break;
    picked.push(s);
  }

  return picked.map(({ option, template, matchesHint }, index) => {
    const isGeneric = template.id === "generico";
    // Ideas concretas: su precio estimado real (no se "acomoda" al presupuesto).
    // Ideas genéricas (gift card, experiencia a elección): monto dentro del presupuesto.
    const estimatedPrice = isGeneric
      ? priceForBands(option.estimatedPrice, input.budgetMin, input.budgetMax, index, picked.length)
      : option.estimatedPrice;
    const budgetFit =
      input.budgetMax != null && estimatedPrice > input.budgetMax
        ? "over"
        : input.budgetMin != null && input.budgetMin > 0 && estimatedPrice < input.budgetMin
          ? "under"
          : "within";

    // En genérico, sumar un interés real a los tags para que el scoring no sea 0
    const tags =
      isGeneric && input.interests.length > 0
        ? Array.from(new Set([...option.tags, input.interests[0].toLowerCase()]))
        : option.tags;

    return {
      name: option.name,
      category: option.category,
      description: option.description,
      whyItFits: honestReason(option, input, matchesHint),
      tags,
      estimatedPrice,
      giftType: option.giftType,
      pros: matchesHint ? option.pros : option.pros.filter((p) => !HINT_CLAIM.test(p)),
      cons: option.cons,
      matchesHint,
      budgetFit,
    };
  });
}
