const { test, expect } = require('@playwright/test');
const pages = ["index.html","cv.html","research.html","publications.html","projects.html","music.html","about.html","legal.html"];
test('all pages load without page errors and fit mobile viewport', async ({page}) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const width of [1440,390,320]) {
    await page.setViewportSize({width,height:900});
    for (const file of pages) {
      const response = await page.goto('/'+file);
      expect(response.status(), file).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+2);
      expect(overflow, file+' at '+width).toBe(false);
    }
  }
  expect(errors).toEqual([]);
});
test('publications are displayed in a clean chronological bibliography', async ({page}) => {
  await page.goto('/publications.html');
  await expect(page.locator('.publication-controls')).toHaveCount(0);
  await expect(page.locator('#bibliography .venue')).toHaveCount(38);
  await expect(page.locator('#bibliography ol.bibliography > li').first()).toBeVisible();
});
test('home navigation and recordings', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.affiliation')).toContainText('Research Scientist');
  await expect(page.locator('.affiliation')).toContainText('Max Planck Institute for Sustainable Materials');
  await expect(page.locator('.affiliation')).not.toContainText('effective');
  await expect(page.locator('.track')).toHaveCount(17);
  await expect(page.getByLabel('Playback mode')).toHaveCount(0);
  await expect(page.locator('#recording-query')).toHaveCount(0);
  await page.locator('.nav-cv').click();
  await expect(page.locator('.cv-intro h1')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#name')).toBeVisible();
});
test('projects and galleries', async ({page}) => {
  await page.goto('/projects.html');
  await expect(page.locator('a.world-atlas-open[href="https://worldmusicscalesatlas.github.io/"]')).toBeVisible();
  await expect(page.locator('.atlas-catalog-stat')).toContainText(/\d+\s+regional tuning models/);
  for(const [id,src] of [['globe','atlas-current-globe.png'],['comparison','atlas-current-comparison.png'],['open-span','atlas-current-open-span.png']]){
    await page.locator('label[for="atlas-view-'+id+'"]').click();
    const img=page.locator('img[src="'+src+'"]');
    await expect(img).toBeVisible();
    await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  }
  await expect(page.locator('.world-atlas-actions a[href*="comparison=mode-dorian"]')).toBeVisible();
});

test('Reverie retains the existing audio and displays its new artwork', async ({page}) => {
  for(const path of ['/','/music.html']) {
    await page.goto(path);
    const track=page.locator('#delangiz');
    await expect(track).toContainText('Reverie');
    await expect(track).toHaveAttribute('href','delangiz.mp3');
    await expect(track).toHaveAttribute('data-cover','reverie-cover.png');
    await page.evaluate(()=>{HTMLMediaElement.prototype.play=()=>Promise.resolve();});
    await track.click();
    await expect(page.locator('#current-track')).toHaveText('Reverie');
    await expect(page.locator('#track-cover')).toHaveAttribute('src','reverie-cover.png');
    await expect.poll(()=>page.locator('#track-cover').evaluate(el=>el.complete&&el.naturalWidth===2048&&el.naturalHeight===2048)).toBe(true);
    await expect(page.locator('#player')).toHaveAttribute('src', /delangiz\.mp3$/);
  }
});

test('featured performance has a responsive embedded video and one external watch button', async ({page}) => {
  await page.route('https://www.youtube-nocookie.com/**', route=>route.fulfill({contentType:'text/html',body:'<html><body>Embedded video test</body></html>'}));
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    for(const url of ['/','/music.html']){
      await page.goto(url);
      const section=page.locator('.music-feature');
      const video=section.locator('iframe.performance-video');
      await video.scrollIntoViewIfNeeded();
      await expect(video).toBeVisible();
      await expect(video).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/prpls-ZqFvQ');
      await expect(section.locator('a[href="https://youtu.be/prpls-ZqFvQ"]')).toHaveCount(1);
      const b=await video.boundingBox();
      expect(Math.abs(b.width/b.height-16/9)).toBeLessThan(.03);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
    }
  }
});

test('illustrated XPS showcase preserves the research identity and CV depth', async ({page}) => {
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    for(const url of ['/','/research.html']){
      await page.goto(url);
      const section=page.locator('#xps-expertise');
      await expect(section.locator('#xps-title')).toHaveText('XPS & Surface Analysis');
      await expect(section.locator('.xps-focus > div')).toHaveCount(3);
      await expect(section.locator('.xps-summary')).toContainText('since 2016');
      const img=section.locator('.xps-art img');
      await img.scrollIntoViewIfNeeded();
      await expect(img).toBeVisible();
      await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth===683&&el.naturalHeight===566)).toBe(true);
      await expect(section.locator('figcaption')).toContainText('not experimental data');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
    }
  }
  await page.goto('/');
  await page.locator('#xps-expertise a[href="research.html#xps-publications"]').click();
  await expect(page).toHaveURL(/research\.html#xps-publications$/);
  await expect(page.locator('#xps-publications')).toBeVisible();
  await page.locator('#xps-expertise a[href="cv.html#xps-expertise"]').click();
  await expect(page.locator('#xps-expertise')).toContainText('vacuum troubleshooting');
  await expect(page.locator('#xps-expertise')).toContainText('multiplet splitting');
  await expect(page.locator('.affiliation')).toContainText('Research Scientist');
});

test('portfolio directory, plain bibliography and standalone navigation', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.directory-grid a')).toHaveCount(4);
  await page.locator('.directory-grid a[href="publications.html"]').click();
  await expect(page.locator('.publication-controls')).toHaveCount(0);
  await expect(page.locator('#bibliography ol.bibliography > li:visible')).toHaveCount(38);
  await page.setViewportSize({width:320,height:800});
  await expect(page.locator('#standalone-menu')).toBeHidden();
  await page.locator('.standalone-toggle').click();
  await expect(page.locator('#standalone-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#standalone-menu')).toBeHidden();
});
test('simple recording list and direct track selection preserve audio assets', async ({page}) => {
  await page.goto('/music.html');
  await expect(page.locator('#recording-query')).toHaveCount(0);
  await expect(page.getByLabel('Playback mode')).toHaveCount(0);
  await expect(page.locator('.track:visible')).toHaveCount(17);
  await page.evaluate(()=>{HTMLMediaElement.prototype.play=()=>Promise.resolve();});
  await expect(page.getByRole('button',{name:'Next track',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Previous track',exact:true})).toHaveCount(0);
  await page.locator('#delangiz').click();
  await expect(page.locator('#current-track')).toHaveText('Reverie');
  await expect(page.locator('#player')).toHaveAttribute('src', /delangiz\.mp3$/);
  await page.locator('.track[href="esfahan-waltz.mp3"]').click();
  await expect(page.locator('#current-track')).toHaveText('Esfahan Waltz');
  await expect(page.locator('#player')).toHaveAttribute('src', /esfahan-waltz\.mp3$/);
});
test('structured portfolio metadata contains all 17 recordings and three apps', async ({page}) => {
  await page.goto('/');
  const graph=await page.locator('script[type="application/ld+json"]').evaluate(el=>JSON.parse(el.textContent)['@graph']);
  expect(graph.filter(x=>x['@type']==='MusicRecording')).toHaveLength(17);
  expect(graph.filter(x=>x['@type']==='WebApplication')).toHaveLength(3);
  for(const path of ['/cv.html','/research.html','/publications.html','/projects.html','/music.html','/about.html','/legal.html']){
    await page.goto(path);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content','summary_large_image');
    expect(await page.locator('script[type="application/ld+json"]').evaluate(el=>JSON.parse(el.textContent).url)).toBe('https://drpouyahosseini.github.io'+path);
  }
});

test('CV omits the redundant independent project link', async ({page}) => {
  await page.goto('/cv.html');
  await expect(page.getByText('Persian Music Scales Visualization', {exact:true})).toHaveCount(0);
});


test('mobile introduction omits decorative dash and redundant XPS link', async ({page}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({width, height: 900});
    await page.goto('/');
    await expect(page.locator('#name')).toHaveText('Pouya Hosseini');
    expect(await page.locator('.hero-role').evaluate(el => getComputedStyle(el, '::before').display)).toBe('none');
    await expect(page.locator('#about a[href="research.html#xps-expertise"]')).toHaveCount(0);
    await expect(page.locator('#xps-expertise')).toBeVisible();
    await expect(page.locator('#about .links a')).toHaveCount(4);
    await page.goto('/about.html');
    await expect(page.locator('#about a[href="research.html#xps-expertise"]')).toHaveCount(0);
    await expect(page.locator('#about .links a')).toHaveCount(3);
  }
});
