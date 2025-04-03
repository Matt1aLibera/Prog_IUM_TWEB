package com.example.springbootserver.services.CsvServices;

import com.example.springbootserver.models.ActorAppearance;
import com.example.springbootserver.repositories.ActorAppearanceRepo;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityTransaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

@Service
public class ActorCsvServ {
    private static final Logger logger = LoggerFactory.getLogger(ActorCsvServ.class);
    private static final int BATCH_SIZE = 300; // Ridotto per maggiore stabilità

    private final EntityManagerFactory entityManagerFactory;
    private final Resource csvFile;
    private final DataLoadChecker dataLoadChecker;

    public ActorCsvServ(
            EntityManagerFactory entityManagerFactory,
            @Value("classpath:csv/actors.csv") Resource csvFile,
            DataLoadChecker dataLoadChecker) {
        this.entityManagerFactory = entityManagerFactory;
        this.csvFile = csvFile;
        this.dataLoadChecker = dataLoadChecker;
    }

    public void loadActorAppearances() {
        if (dataLoadChecker.isDataAlreadyLoaded()) {
            logger.info("SKIP - Actor appearances already loaded");
            return;
        }

        EntityManager em = entityManagerFactory.createEntityManager();
        EntityTransaction transaction = em.getTransaction();

        int savedCount = 0;
        int errorCount = 0;
        long startTime = System.currentTimeMillis();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(csvFile.getInputStream()))) {
            transaction.begin();

            reader.readLine(); // Skip header
            String line;
            int lineNumber = 1;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                try {
                    String[] values = parseCsvLine(line);
                    if (values.length < 2 || values[0].isEmpty() || values[1].isEmpty()) {
                        logger.debug("SKIP - Riga {}: Campi mancanti", lineNumber);
                        continue;
                    }

                    ActorAppearance entity = new ActorAppearance(
                            Long.parseLong(values[0].trim()),
                            values[1].trim(),
                            values.length > 2 ? values[2].trim() : null
                    );

                    em.persist(entity);
                    savedCount++;

                    if (savedCount % BATCH_SIZE == 0) {
                        em.flush();
                        em.clear();
                        transaction.commit();

                        // Ricomincia transazione
                        transaction.begin();
                        logger.info("Committed batch of {} records (Total: {})", BATCH_SIZE, savedCount);
                    }
                } catch (Exception e) {
                    errorCount++;
                    logger.error("ERR - Riga {}: {}", lineNumber, e.toString());
                }
            }

            // Commit finale
            if (transaction.isActive()) {
                transaction.commit();
            }

            long duration = (System.currentTimeMillis() - startTime) / 1000;
            logger.info("Load completed. Success: {}, Errors: {}, Time: {}s",
                    savedCount, errorCount, duration);

        } catch (IOException e) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw new RuntimeException("CSV read error", e);
        } finally {
            if (em.isOpen()) {
                em.close();
            }
        }
    }

    private String[] parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder currentValue = new StringBuilder();

        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                values.add(currentValue.toString().trim());
                currentValue = new StringBuilder();
            } else {
                currentValue.append(c);
            }
        }
        values.add(currentValue.toString().trim());
        return values.toArray(new String[0]);
    }

    @Component
    public static class DataLoadChecker {
        private final ActorAppearanceRepo appearanceRepo;

        public DataLoadChecker(ActorAppearanceRepo appearanceRepo) {
            this.appearanceRepo = appearanceRepo;
        }

        @Transactional(readOnly = true)
        public boolean isDataAlreadyLoaded() {
            try {
                return appearanceRepo.count() > 0;
            } catch (Exception e) {
                logger.error("Error checking loaded data", e);
                return true; // Safe fallback
            }
        }
    }
}