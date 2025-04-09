package com.example.springbootserver.services.CsvServices;
import com.example.springbootserver.models.OscarAward;
import com.example.springbootserver.repositories.OscarAwardRepo;
import jakarta.persistence.EntityManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.ArrayList;

@Service
public class OscarCsvServ {
    private static final Logger logger = LoggerFactory.getLogger(OscarCsvServ.class);

    private final OscarAwardRepo oscarAwardRepo;
    private final Resource csvFile;
    private final EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate;

    public OscarCsvServ(
            OscarAwardRepo oscarAwardRepo,
            @Value("classpath:csv/the_oscar_awards.csv") Resource csvFile,
            EntityManager entityManager,
            JdbcTemplate jdbcTemplate) {
        this.oscarAwardRepo = oscarAwardRepo;
        this.csvFile = csvFile;
        this.entityManager = entityManager;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public boolean isAlreadyLoaded() {
        try {
            if (!tableExists("oscar_awards")) {
                return false;
            }
            return oscarAwardRepo.count() > 0;
        } catch (Exception e) {
            logger.warn("Errore nel verificare lo stato del caricamento", e);
            return false;
        }
    }

    private boolean tableExists(String tableName) {
        try {
            Long count = (Long) entityManager.createNativeQuery(
                            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?1")
                    .setParameter(1, tableName.toLowerCase())
                    .getSingleResult();
            return count > 0;
        } catch (Exception e) {
            logger.warn("Errore nel verificare l'esistenza della tabella", e);
            return false;
        }
    }

    @Transactional
    public void loadOscarAwards() {
        if (isAlreadyLoaded()) {
            logger.info("SKIP - Tabella OscarAwards già popolata");
            return;
        }

        createTableIfNotExists();

        List<OscarAward> validAwards = new ArrayList<>();
        AtomicInteger processedRows = new AtomicInteger(0);
        AtomicInteger skippedRows = new AtomicInteger(0);

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(csvFile.getInputStream()))) {
            String line;
            int lineNumber = 0;

            reader.readLine(); // Skip header
            lineNumber++;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                processedRows.incrementAndGet();

                try {
                    String[] values = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);

                    // Validazione numero minimo di campi e campi obbligatori
                    if (values.length < 7 || values[5].isEmpty() || values[4].isEmpty()) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: Dati mancanti o incompleti", lineNumber);
                        continue;
                    }

                    OscarAward award = new OscarAward();

                    // Parsing dei campi obbligatori
                    award.setFilm(values[5].trim().replaceAll("^\"|\"$", ""));
                    award.setName(values[4].trim().replaceAll("^\"|\"$", ""));

                    // Parsing degli altri campi con gestione degli errori
                    try {
                        award.setYearFilm(Integer.parseInt(values[0].trim()));
                    } catch (NumberFormatException e) {
                        award.setYearFilm(1900); // valore di default
                    }

                    try {
                        award.setYearCeremony(Integer.parseInt(values[1].trim()));
                    } catch (NumberFormatException e) {
                        award.setYearCeremony(1900); // valore di default
                    }

                    try {
                        award.setCeremony(Integer.parseInt(values[2].trim()));
                    } catch (NumberFormatException e) {
                        award.setCeremony(1); // valore di default
                    }

                    award.setCategory(values[3].trim().replaceAll("^\"|\"$", ""));

                    // Parsing del campo winner
                    String winnerStr = values[6].trim().replaceAll("^\"|\"$", "");
                    award.setWinner("true".equalsIgnoreCase(winnerStr) || "1".equals(winnerStr));

                    validAwards.add(award);

                } catch (Exception e) {
                    skippedRows.incrementAndGet();
                    logger.error("ERR - Riga {}: {}", lineNumber, e.getMessage());
                }
            }

            if (!validAwards.isEmpty()) {
                // Batch processing ottimizzato per JPA
                int batchSize = 1000;
                for (int i = 0; i < validAwards.size(); i++) {
                    entityManager.persist(validAwards.get(i));

                    if (i % batchSize == 0 && i > 0) {
                        entityManager.flush();
                        entityManager.clear();
                    }
                }

                logger.info("SUCCESS - Caricati {} record ({} righe processate, {} saltate)",
                        validAwards.size(), processedRows.get(), skippedRows.get());
            } else {
                logger.warn("WARN - Nessun record valido trovato");
            }

        } catch (IOException e) {
            logger.error("CRITICAL - Errore accesso file CSV", e);
            throw new RuntimeException("Errore di lettura file CSV", e);
        }
    }

    private void createTableIfNotExists() {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS oscar_awards (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "year_film INTEGER NOT NULL, " +
                    "year_ceremony INTEGER NOT NULL, " +
                    "ceremony INTEGER NOT NULL, " +
                    "category VARCHAR(200) NOT NULL, " +
                    "name VARCHAR(1000) NOT NULL, " +
                    "film VARCHAR(1000) NOT NULL, " +
                    "winner BOOLEAN NOT NULL)");
        } catch (Exception e) {
            logger.error("Errore nella creazione della tabella", e);
            throw new RuntimeException("Errore creazione tabella", e);
        }
    }
}
