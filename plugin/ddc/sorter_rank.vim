let s:name = fnamemodify(expand('<sfile>'), ':t:r')

if exists('g:loaded_ddc_' . s:name)
  finish
endif
let g:loaded_ddc_{s:name} = 1

silent! call ddc#register_filter({
      \ 'name': s:name,
      \ 'path': printf('%s/denops/ddc/filters/%s.ts',
      \                fnamemodify(expand('<sfile>'), ':h:h:h'), s:name),
      \ })
