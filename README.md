# ddc-sorter_rank

Matched rank order sorter for ddc.vim

It is matched rank order sorter.  The higher the head matched word or already
typed or inserted word.


## Required

### denops.vim
https://github.com/vim-denops/denops.vim

### ddc.vim
https://github.com/Shougo/ddc.vim


## Configuration

```vim
" Use sorter_rank.
call ddc#custom#patch_global('sourceOptions', {
      \ '_': {
      \   'sorters': ['sorter_rank'],
      \ })
```
