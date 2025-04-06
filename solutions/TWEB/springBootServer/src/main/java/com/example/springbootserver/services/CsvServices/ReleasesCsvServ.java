package com.example.springbootserver.services.CsvServices;
import com.example.springbootserver.models.ActorAppearance;
import com.example.springbootserver.models.Release;
import com.example.springbootserver.repositories.ActorAppearanceRepo;
import com.example.springbootserver.repositories.ReleaseRepo;
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
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.ArrayList;
import java.util.List;
@Service
public class ReleasesCsvServ {
    private static final Logger logger = LoggerFactory.getLogger(ReleasesCsvServ.class);
    private static final int BATCH_SIZE = 1000;

    private final ReleaseRepo releaseRepo;
    private final Resource csvFile;
    private final EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate;

    public ReleasesCsvServ(
            ReleaseRepo releaseRepo,
            @Value("classpath:csv/releases.csv") Resource csvFile,
            EntityManager entityManager,
            JdbcTemplate jdbcTemplate) {
        this.releaseRepo = releaseRepo;
        this.csvFile = csvFile;
        this.entityManager = entityManager;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public boolean isAlreadyLoaded() {
        try {
            if (!tableExists("release")) {
                return false;
            }
            return releaseRepo.count() > 0;
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
    public void loadReleases() {
        if (isAlreadyLoaded()) {
            logger.info("SKIP - Tabella Release già popolata");
            return;
        }

        createTableIfNotExists();

        List<Release> validReleases = new ArrayList<>();
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

                    // Verifica campi obbligatori: movieId e country
                    if (values.length < 3 || values[0].isEmpty() || values[1].isEmpty()) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: Formato non valido (campi mancanti)", lineNumber);
                        continue;
                    }

                    Release release = new Release();
                    try {
                        release.setMovieId(Long.parseLong(values[0].trim()));
                    } catch (NumberFormatException e) {
                        skippedRows.incrementAndGet();
                        logger.warn("SKIP - Riga {}: movie_id non numerico - {}", lineNumber, values[0]);
                        continue;
                    }

                    release.setCountry(values[1].trim().replaceAll("^\"|\"$", ""));

                    // Data di uscita (opzionale)
                    if (values.length > 2 && !values[2].isEmpty()) {
                        try {
                            release.setDate(LocalDate.parse(values[2].trim()));
                        } catch (Exception e) {
                            logger.warn("WARN - Riga {}: Formato data non valido - {}", lineNumber, values[2]);
                        }
                    }

                    // Tipo di uscita (opzionale)
                    if (values.length > 3 && !values[3].isEmpty()) {
                        release.setType(values[3].trim().replaceAll("^\"|\"$", ""));
                    }

                    // Rating (opzionale)
                    if (values.length > 4 && !values[4].isEmpty()) {
                        release.setRating(values[4].trim().replaceAll("^\"|\"$", ""));
                    }

                    validReleases.add(release);

                } catch (Exception e) {
                    skippedRows.incrementAndGet();
                    logger.error("ERR - Riga {}: {} - Linea: {}", lineNumber, e.getMessage(), line);
                }
            }

            if (!validReleases.isEmpty()) {
                // Batch processing ottimizzato per JPA
                int batchSize = 1000;
                for (int i = 0; i < validReleases.size(); i++) {
                    entityManager.persist(validReleases.get(i));

                    if (i % batchSize == 0 && i > 0) {
                        entityManager.flush();
                        entityManager.clear();
                    }
                }

                logger.info("SUCCESS - Caricati {} release ({} righe processate, {} saltate)",
                        validReleases.size(), processedRows.get(), skippedRows.get());
            } else {
                logger.warn("WARN - Nessuna release valida trovata");
            }

        } catch (IOException e) {
            logger.error("CRITICAL - Errore accesso file CSV", e);
            throw new RuntimeException("Errore di lettura file CSV", e);
        }
    }

    private void createTableIfNotExists() {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS release (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "movie_id BIGINT NOT NULL, " +
                    "country VARCHAR(255) NOT NULL, " +
                    "date DATE, " +
                    "type VARCHAR(255), " +
                    "rating VARCHAR(50))");
            logger.info("Tabella release verificata/creata con successo");
        } catch (Exception e) {
            logger.error("Errore nella creazione della tabella release", e);
            throw new RuntimeException("Impossibile creare la tabella release", e);
        }
    }
}