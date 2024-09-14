import {
    App,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
} from "obsidian";

// Definição das configurações do plugin
interface MyPluginSettings {
    tmdbApiKey: string;
    tmdbLanguage: string;
    notesFolder: string; // Caminho da pasta onde as notas serão criadas
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    tmdbApiKey: "",
    tmdbLanguage: "pt-BR", // Padrão: Português Brasileiro
    notesFolder: "", // Padrão: pasta raiz do Vault
};

export default class TmdbPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        // Cria um ícone na ribbon (barra lateral)
        const ribbonIconEl = this.addRibbonIcon(
            "film",
            "TMDB Plugin",
            (evt: MouseEvent) => {
                new Notice("Buscando filmes...");
                this.openSearchModal();
            }
        );
        ribbonIconEl.addClass("tmdb-plugin-ribbon-class");

        // Adiciona um comando simples para abrir a busca por filmes
        this.addCommand({
            id: "search-movie",
            name: "Buscar Filme na TMDB",
            callback: () => {
                this.openSearchModal();
            },
        });

        // Adiciona uma aba de configurações para o plugin
        this.addSettingTab(new TmdbSettingTab(this.app, this));
    }

    // Abre o modal de busca
    openSearchModal() {
        new SearchMovieModal(this.app, this).open();
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// Modal para buscar o filme
class SearchMovieModal extends Modal {
    plugin: TmdbPlugin;

    constructor(app: App, plugin: TmdbPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;

        // Título do popup
        contentEl.createEl("h1", { text: "Buscar Filme ou Série" });

        // Campo de seleção: Filme ou Série
        const typeSelect = contentEl.createEl("select");
        const movieOption = typeSelect.createEl("option", {
            text: "Filme",
            value: "movie",u
        });
        const seriesOption = typeSelect.createEl("option", {
            text: "Série",
            value: "tv",
        });

        // Campo de entrada para o nome do filme ou série
        const input = contentEl.createEl("input", {
            type: "text",
            placeholder: "Digite o nome do filme ou série...",
        });
        const button = contentEl.createEl("button", { text: "Buscar" });

        // Ação ao clicar no botão de busca
        button.onclick = async () => {
            const query = input.value.trim();
            const type = typeSelect.value; // 'movie' ou 'tv'
            if (query) {
                // Busca o filme ou série na API TMDB
                await this.searchMovieOrSeries(query, type);
            } else {
                new Notice("Por favor, insira um nome.");
            }
        };
    }

    // Função para buscar filme ou série
    async searchMovieOrSeries(query: string, type: string) {
        const url = `https://api.themoviedb.org/3/search/${type}?api_key=${
            this.plugin.settings.tmdbApiKey
        }&query=${encodeURIComponent(query)}&language=${
            this.plugin.settings.tmdbLanguage
        }`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                this.displayResults(data.results, type);
            } else {
                new Notice("Nenhum resultado encontrado.");
            }
        } catch (error) {
            console.error(error);
            new Notice("Erro ao buscar dados.");
        }
    }

    // Exibe os resultados com a imagem
    displayResults(results: any[], type: string) {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "Resultados da Busca" });

        results.forEach((item) => {
            const itemEl = contentEl.createEl("div", { cls: "item-result" });

            // Adiciona imagem do pôster
            const posterPath = item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : "";
            const imageEl = itemEl.createEl("img", {
                attr: {
                    src: posterPath,
                    alt: item.title || item.name,
                    width: "100px",
                },
            });

            // Adiciona título e data de lançamento
            const infoEl = itemEl.createEl("div");
            infoEl.createEl("span", {
                text: `${item.title || item.name} (${
                    item.release_date || item.first_air_date
                        ? (item.release_date || item.first_air_date).split(
                              "-"
                          )[0]
                        : "Desconhecido"
                })`,
            });

            // Clique para criar a nota
            itemEl.onclick = () => {
                this.createNoteForItem(item, type);
            };

            // Estilizando
            itemEl.style.display = "flex";
            itemEl.style.alignItems = "center";
            itemEl.style.marginBottom = "10px";
            imageEl.style.marginRight = "10px";
        });
    }

    // Cria uma nota com as informações do filme selecionado no formato desejado
    async createMovieNote(movie: any) {
        const fileName = `${movie.title} (${
            movie.release_date || "Data não disponível"
        }).md`;

        // Gera o conteúdo da nota com base nos detalhes do filme
        const fileContent = `---
titulo: "${movie.title}"
ano: "${movie.release_date ? movie.release_date.split("-")[0] : "Desconhecido"}"
gênero:
  - ${movie.genre_ids.map((id) => this.getGenreName(id)).join("\n  - ")}
duration: ${movie.runtime || "Desconhecida"} min
image: https://image.tmdb.org/t/p/w500${movie.poster_path}
lançado: ${movie.release_date ? true : false}

tags:
  - filme
---

# Resumo
${movie.overview || "Nenhuma descrição disponível."}
`;

        // Caminho da pasta onde a nota será criada
        const folderPath = this.plugin.settings.notesFolder || ""; // Se vazio, vai para a raiz do Vault
        const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

        // Cria a nota na pasta especificada ou na raiz do Vault
        try {
            await this.app.vault.create(fullPath, fileContent);
            new Notice(`Nota criada: ${fullPath}`);
            this.close();
        } catch (err) {
            new Notice("Erro ao criar a nota. Verifique se a pasta existe.");
            console.error(err);
        }
    }

    // Mapeia os IDs dos gêneros para os nomes (baseado na TMDB)
    getGenreName(id: number): string {
        const genres: { [key: number]: string } = {
            28: "Ação",
            12: "Aventura",
            16: "Animação",
            35: "Comédia",
            80: "Crime",
            99: "Documentário",
            18: "Drama",
            10751: "Família",
            14: "Fantasia",
            36: "História",
            27: "Terror",
            10402: "Música",
            9648: "Mistério",
            10749: "Romance",
            878: "Ficção Científica",
            10770: "Filme de TV",
            53: "Thriller",
            10752: "Guerra",
            37: "Ocidental",
        };
        return genres[id] || "Unknown";
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Aba de configurações para o plugin
class TmdbSettingTab extends PluginSettingTab {
    plugin: TmdbPlugin;

    constructor(app: App, plugin: TmdbPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // Configuração da chave da API do TMDB
        new Setting(containerEl)
            .setName("Chave da API TMDB")
            .setDesc("Adicione sua chave de API da TMDB para buscar filmes.")
            .addText((text) =>
                text
                    .setPlaceholder("Insira sua chave de API aqui")
                    .setValue(this.plugin.settings.tmdbApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.tmdbApiKey = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Configuração do idioma para a consulta
        new Setting(containerEl)
            .setName("Idioma")
            .setDesc(
                "Escolha o idioma para os resultados do TMDB (ex: pt-BR, en-US)."
            )
            .addText((text) =>
                text
                    .setPlaceholder("pt-BR")
                    .setValue(this.plugin.settings.tmdbLanguage)
                    .onChange(async (value) => {
                        this.plugin.settings.tmdbLanguage = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Configuração da pasta onde as notas serão criadas
        new Setting(containerEl)
            .setName("Pasta para salvar as notas")
            .setDesc(
                "Insira o caminho da pasta onde as notas serão criadas. Deixe em branco para salvar na raiz do Vault."
            )
            .addText((text) =>
                text
                    .setPlaceholder("Ex: Filmes")
                    .setValue(this.plugin.settings.notesFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.notesFolder = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}
