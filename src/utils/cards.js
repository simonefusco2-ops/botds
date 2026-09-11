const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

/**
 * Costruisce un messaggio "Components V2".
 *
 * Gli embed classici mostrano l'immagine sempre in fondo e non hanno separatori:
 * qui invece il banner apre il messaggio e i titoli usano gli heading markdown
 * (# / ###), che Discord rende molto più grandi del testo normale.
 *
 * Un messaggio con questo formato non può contenere `content` né `embeds`.
 */
function buildCard({ accentColor, bannerRef, thumbnailRef, title, body, sections, footnote, rows = [] }) {
  const container = new ContainerBuilder();
  if (accentColor) container.setAccentColor(accentColor);

  if (bannerRef) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bannerRef)),
    );
  }

  const header = [];
  if (title) header.push(`# ${title}`);
  if (body) header.push(body);

  if (header.length) {
    const headerText = new TextDisplayBuilder().setContent(header.join('\n'));

    if (thumbnailRef) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(headerText)
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailRef)),
      );
    } else {
      container.addTextDisplayComponents(headerText);
    }
  }

  if (sections?.length) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        sections.map((section) => `### ${section.name}\n${section.value}`).join('\n\n'),
      ),
    );
  }

  if (footnote) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footnote}`));
  }

  for (const row of rows) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(row);
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { buildCard };
