(async function () {
  const delay = ms => new Promise(res => setTimeout(res, ms));

  async function waitForElement(selector, context = document, maxRetries = 10, interval = 300) {
    for (let i = 0; i < maxRetries; i++) {
      const el = context.querySelector(selector);
      if (el) return el;
      await delay(interval);
    }
    return null;
  }

  async function setTimeBySpinbutton(container, time) {
    const [hour, minute] = time.split(':');
    const spans = container.querySelectorAll('span[role="spinbutton"]');
    if (spans.length < 2) return;

    const setSpin = async (el, value) => {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      el.dispatchEvent(new Event('focus', { bubbles: true }));
      document.execCommand('insertText', false, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));

      await delay(50);
    };

    await setSpin(spans[0], hour);
    await setSpin(spans[1], minute);
  }

  async function fillTimeEntry() {
    const card = document.querySelector('.ExpandedTimeCard-module__expandedWrapper___nwB0B');
    const form = card.querySelector('form.TimeEntryForm-module__expandableGrid___HFWjE');
    if (!form) return console.error('Form not found');

    const breakDeleteBtn = card.querySelector('[data-test-id="timecard-delete-period-1"]');
    if (breakDeleteBtn) {
      breakDeleteBtn.click();
      console.log('🗑️ Deleted break row');
      await delay(800);
    }

    const firstStart = await waitForElement('[data-test-id="periods.0.start"]', form);
    const firstEnd = await waitForElement('[data-test-id="periods.0.end"]', form);
    await setTimeBySpinbutton(firstStart, '08:45');
    await setTimeBySpinbutton(firstEnd, '10:15');

    const projectBtns = form.querySelectorAll('[data-test-id="time-period-row-project-picker-trigger"]');
    projectBtns[0]?.click();
    await delay(300);
    const nonWbso = [...document.querySelectorAll('[role="option"]')].find(opt => opt.textContent.includes('P2 - Non WBSO'));
    nonWbso?.click();

    const addWorkBtn = card.querySelector('[data-test-id="timecard-add-work"]');
    addWorkBtn?.click();
    await delay(800);

    const secondStart = await waitForElement('[data-test-id="periods.1.start"]', form);
    const secondEnd = await waitForElement('[data-test-id="periods.1.end"]', form);
    await setTimeBySpinbutton(secondStart, '10:30');
    await setTimeBySpinbutton(secondEnd, '17:00');

    const updatedBtns = form.querySelectorAll('[data-test-id="time-period-row-project-picker-trigger"]');
    updatedBtns[1]?.click();
    await delay(300);
    const wbso = [...document.querySelectorAll('[role="option"]')].find(opt => opt.textContent.includes('P2 - WBSO'));
    wbso?.click();

    // const saveBtn = card.querySelector('[data-test-id="timecard-save-button"]');
    // if (saveBtn) {
    //   saveBtn.click();
    //   console.log('💾 Saved entry');
    //   await delay(1000);
    // }

    console.log('Entry filled (dry run)');
  }

  const dayCards = [...document.querySelectorAll('.TimecardRow-module__timecard___M850p')];

  for (const card of dayCards) {
    const cardText = card.textContent.trim();
    const dayLabel = cardText.slice(0, 3).toLowerCase();

    const isWeekend = dayLabel === 'sat' || dayLabel === 'sun';
    const isFilled = /\d{2}:\d{2}.*\d{2}:\d{2}/.test(cardText);

    const holidaySpan = card.querySelector('.DayRangeCell-module__holidayName___um7nq');
    const isDutchHoliday = holidaySpan && holidaySpan.textContent.includes('Dutch Time Off');

    if (isWeekend) {
      console.log(`Skipping weekend: ${cardText.slice(0, 20)}`);
      continue;
    }

    if (isFilled) {
      console.log(`Skipping already filled: ${cardText.slice(0, 30)}`);
      continue;
    }

    if (isDutchHoliday) {
      console.log(`🇳🇱 Skipping Dutch holiday: ${cardText.slice(0, 30)}`);
      continue;
    }

    card.scrollIntoView({ behavior: 'smooth' });
    card.click();

    console.log(`🕓 Filling day: ${cardText.slice(0, 30)}...`);
    await delay(1000);

    await fillTimeEntry();
    await delay(1500);
  }

  console.log('All eligible weekday entries processed (no saves)');
})();
