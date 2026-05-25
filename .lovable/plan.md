Para deixar o seu site com a mesma aparência e estilo do golfield.lovable.app, realizarei as seguintes mudanças:

1. **Atualização da Identidade Visual (Cores):**
   - Vou modificar as variáveis de cores no arquivo `src/styles.css` para usar a paleta escura e moderna do GolField.
   - O fundo será um azul marinho muito escuro (`oklch(0.129 0.042 264.695)`), com cards em um tom levemente mais claro e bordas sutis.
   - As cores de destaque (sucesso, alertas) serão ajustadas para os tons de verde água e laranja vistos no site de referência.

2. **Ajustes no Layout da Sidebar:**
   - Vou renomear o título na sidebar de "2026" para "GOLFIELD" (ou o nome do seu projeto).
   - Adicionarei os rótulos de seção como "PLANILHA" e "ABAS" para organizar melhor o menu lateral.
   - Mudarei o estilo dos itens do menu para combinar com os botões arredondados e preenchidos do GolField.

3. **Estilização dos Cards e Tabelas:**
   - Os cards de resumo (Total de Pedidos, Liberado, etc.) receberão ícones coloridos ao lado e um design mais "limpo".
   - A tabela principal será ajustada para ter o fundo escuro, com linhas separadas por cores suaves e badges de status (TRUE/FALSE) estilizados em verde e vermelho.

4. **Componente de Status de Sincronização:**
   - Vou atualizar o banner de conexão para ser mais discreto e moderno, similar ao indicador de "Sincronizado" do GolField.

### Detalhes Técnicos
- Edição do arquivo `src/styles.css` para sobrescrever o tema padrão.
- Refatoração do `src/components/AppLayout.tsx` para incluir os novos elementos de navegação e títulos.
- Pequenos ajustes nos componentes de visualização de dados para usar as novas classes de estilo.