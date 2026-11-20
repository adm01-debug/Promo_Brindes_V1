## PF-114..PF-127
| ID | Funcionalidade | Estado HOJE | O que falta | Evidência | Mudou? | Quem |
|---|---|---|---|---|---|---|
| PF-114 | Produto inexistente ≠ falha temporária | PARCIAL | Ramo `!product` já tem Seo "Produto não encontrado" noIndex e link, mas reusa `CatalogError` com h2 fixo "O catálogo fez uma pausa." + role=alert | `ProductPage.tsx:130-133`; `CatalogFeedback.tsx:21-30` | não | ENG + mockup |
| PF-115 | "Em alta" só com dado real | DIVERGÊNCIA | chip `perfil=destaques` → `profile:'featured'` → `is_featured`; título diz "Destaques da curadoria"; home "Tendências da vez." usa mesma consulta; chip "Tendências" = `perfil=novos` (3 nomes/2 conceitos) | `catalogFilters.ts:10,11`; `useCatalogPageState.ts:95-97`; `catalog.ts:402,413`; `CatalogPage.tsx:62`; `HomePage.tsx:105,221` | não | DONO + ENG |
| PF-116 | Textos auxiliares legíveis | PARCIAL | 476 `font-size`; **142** ≤0,69rem (76 `0.xx` + 66 `.xx`; auditoria contou 77); +78 entre 0,70–0,74 | `src/styles.css` | não | ENG + mockup |
| PF-117 | Fundo limpo atrás da foto do card | IMPLEMENTADO | — | `styles.css:4449-4452` gradiente linear; #88 `217f785` 27/10 | sim | — |
| PF-118 | Privacidade cobre "Minhas datas"; seção acessível sem rolar | PARCIAL | `grep -c datas PrivacyPage.tsx` = 0; seção após toda a agenda (`:326,330-336`), atalho só `#agenda` (`:292`) | `PrivacyPage.tsx:11-12`; `CommemorativeDatesPage.tsx:292,326,330-336` | não | ENG + mockup |
| PF-119 | Descoberta Freeshop (BreadcrumbList, histórico, recentes, /datas/*, ampliação em zero, SSR categoria, ItemList inicial, 2ª imagem, recomendações) | PARCIAL (quase tudo NÃO INICIADO) | `BreadcrumbList` 0; `ItemList` só datas no cliente (`CommemorativeDatesPage.tsx:274`); histórico/recentes 0; rotas `/datas/*` só `/datas-comemorativas` (`App.tsx:110-127`; `site-page.ts:33,76` `?data=`); 2ª imagem (`ProductCard.tsx:29-40` 1 img); ampliação (`CatalogPage.tsx:76`; `CatalogFeedback.tsx:32-40`); SSR categoria só metadados (`site-page.ts:30-43`). Parcial: relacionados por categoria (`ProductPage.tsx:31`) + material (`catalogRanking.ts:116-126`) | — | não | ENG + mockup |
| PF-120 | Métricas prometidas sem evento | NÃO INICIADO | sem remoção/limpeza de seleção (`QuoteDrawer.tsx:209,255` sem track), `shared_selection_opened` (`SharedSelectionPage.tsx` 0 track), abandono por campo, tempo até 1ª seleção, WhatsApp, `has_query` em `catalog_result_viewed` (`:7`) | `analytics.ts:4-38` (36 eventos) | parcial (#168/#175/#172 outros) | ENG |
| PF-121 | Comparação salva em bloco e compartilhável | NÃO INICIADO | Bandeja só ver/ocultar/limpar/remover | `CatalogComparisonTray.tsx:30-31,41` | não | ENG + mockup |
| PF-122 | Onde a seleção fica (navegador × conta) no fluxo | PARCIAL | Drawer não diz (`grep navegador\|conta QuoteDrawer.tsx` = 0); só `PrivacyPage.tsx:11` e `SavedSelections.tsx:178,183,185` | — | não | ENG |
| PF-123 | "Reenviar código" / "Usar outro e-mail" | PARCIAL | Reenvio = repetir submit (`:126`); links só senha/esqueci/voltar (`:130-132`); `grep reenviar` = 0 | `CustomerLoginPage.tsx:59-65,126,130-132` | não | ENG + mockup |
| PF-124 | Anexos no detalhe do orçamento (portal) | NÃO INICIADO | RPC `get_my_quote_request` (`20260922160000:145-200`) não devolve anexos; UI sem seção (`CustomerQuotePage.tsx:243-246`) apesar de `customer_briefing_assets.quote_request_id` (`20260922150000:21,38`) | — | não | ENG (DDL → regra 8) |
| PF-125 | Preferências e exclusão dentro da conta | NÃO INICIADO | Conta = sair + seleções + histórico (`CustomerAccountPage.tsx:77-99`); nenhuma rota; `erase_customer_data` só service_role | — | não | ENG + DONO |
| PF-126 | E-mail dedicado + horário | BLOQUEADO | `ContactPage.tsx:19` `mailto:adm01@…` **hardcoded** (não lê `VITE_CONTACT_EMAIL`, que `quoteRequest.ts:95`/`contactRequest.ts:48` leem); horário 0 | `.env.example:20` | não | DONO; ENG troca texto |
| PF-127 | Hero fotográfico real | BLOQUEADO | `hero-gen-z-v2*.webp`, alt="" | `HomePage.tsx:132-140` | não | CONTEÚDO |

## Novos (UX)
| ID | Funcionalidade | Estado | O que falta | Evidência | Quem |
|---|---|---|---|---|---|
| NOVO-UX-01 | Confirmação pós-envio com resumo da seleção, imprimir e prazo (PLANO_UX UX67 :459-461; Gen Z :261) | PARCIAL | Sucesso não lista itens, não imprime (botão só no formulário `:435`), sem prazo | `QuotePage.tsx:370-403,435` | ENG + mockup; prazo DONO |
| NOVO-UX-02 | Breadcrumb nomeado em todas as páginas internas (UX_STRATEGY :85) | PARCIAL | Só produto tem trilha | `grep -rln breadcrumb src --include=*.tsx` = só `ProductPage.tsx:140-141` | ENG + mockup |
| NOVO-UX-03 | E2E troca de conta A→B mesma aba (plano-50 #13; PORTAL 30) | PARCIAL | Só logout/outra aba | `smoke.spec.ts:790-850`; grep "conta B" = 0 | ENG |
| NOVO-UX-04 | Catches silenciosos instrumentados (plano-50 #39) | PARCIAL | `reportClientError` engole falha; `operationalAlerts` devolve false sem motivo | `clientObservability.ts:16-18`; `operationalAlerts.ts:35-36` | ENG |
| NOVO-UX-05 | Comparador 2–4 itens no moodboard, ausências "consultar" (Freeshop 5.7) | PARCIAL (desvio) | Limite 3; bandeja no catálogo; sem "consultar" | `catalogComparison.ts:4` | DONO ou ENG + mockup |
| NOVO-UX-06 | Editorial com vínculo mensurável a buscas/saves (Freeshop P2 :207) | PARCIAL | Eventos sem `source`/`collection_id` | `analytics.ts:8-9,14-15,35-36` | ENG |
| NOVO-UX-07 | Quadro compartilhado com comentários (Freeshop P2 :205, se demanda) | BLOQUEADO | — | `SharedSelectionPage.tsx` grep comentário = 0 | DONO |
| NOVO-UX-08 | Prettier + --check (plano-50 #06) | NÃO INICIADO (descartado com registro) | — | `.prettierrc` inexistente; `P13:118` | DONO |
| NOVO-UX-09 | Higienizar swatches sem nome/duplicados na origem (UX_AUDIT F06) | BLOQUEADO (canônico) | Contrato só avisa | `check-catalog-public-contract.mjs:213,323,363-364,396` | DONO (Promo Gifts) |

Divergências: PF-117 doc desatualizado (#88 mergeada 27/10; `UX_AUDIT_REPORT.md:350` ainda aberto); PF-116 contagem 77→142; PF-119 relacionados já por material; UX70 produtor existe; E-022 e2e existe (#170); PF-13 comentário `QuotePage.tsx:357-364` não existe mais; 3 nomes para 2 conceitos (Em alta/Destaques/Tendências); novo "Abrir o radar de produtos" `HomePage.tsx:231` (#166) viola guia; `ContactPage.tsx:19` hardcoded.
Não verificado: dashboards/CWV/flags remotos; legibilidade visual; hero gerado por IA; telemetria no canônico.
