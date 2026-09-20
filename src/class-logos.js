export const classLogos=Object.freeze({
 '1º D':'/class-logos/1d-fenix.png',
 '2º A':'/class-logos/2a-segundao.png',
 '2º C':'/class-logos/2c-dragao.png',
 '3º B':'/class-logos/3b-cavalo.png',
 '3º C':'/class-logos/3c-zeus.png',
 '3º D':'/class-logos/3d-dragao.png',
 '3º E':'/class-logos/3e-anubis.png'
});

export const logoForClass=className=>classLogos[className]||null;
