!macro customInstall
  WriteRegStr HKCR "Software\Classes\Applications\${PRODUCT_FILENAME}" "DefaultIcon" "$INSTDIR\${PRODUCT_FILENAME},0"
!macroend